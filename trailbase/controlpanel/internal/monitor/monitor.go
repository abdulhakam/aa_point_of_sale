// Package monitor starts, stops and observes the TrailBase server process: it
// launches `trail`, mirrors the app and migrations into the depot the way
// RUN.BAT does, captures the server's console output, and samples the process's
// CPU and memory (and the machine's) while it runs.
package monitor

import (
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	gcpu "github.com/shirou/gopsutil/v4/cpu"
	gmem "github.com/shirou/gopsutil/v4/mem"
	gproc "github.com/shirou/gopsutil/v4/process"
)

// Config describes how to bring the server up.
type Config struct {
	Depot         string // e.g. "traildepot"
	Address       string // e.g. "127.0.0.1:4000"
	TrailPath     string // "trail" (on PATH) or a full path to trail.exe
	AdminUser     string
	AdminPassword string
	SourceRoot    string // the trailbase dir holding runtime\ and migrations\
	SyncSources   bool   // mirror runtime\ and migrations\ into the depot first
}

// ring is a bounded, mutex-guarded log buffer.
type ring struct {
	mu    sync.Mutex
	lines []string
	part  string
	cap   int
}

func newRing(n int) *ring { return &ring{cap: n} }

func (r *ring) Write(p []byte) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.part += string(p)
	for {
		i := strings.IndexByte(r.part, '\n')
		if i < 0 {
			break
		}
		line := strings.TrimRight(r.part[:i], "\r")
		r.part = r.part[i+1:]
		r.lines = append(r.lines, line)
		if len(r.lines) > r.cap {
			r.lines = r.lines[len(r.lines)-r.cap:]
		}
	}
	return len(p), nil
}

func (r *ring) add(line string) {
	r.mu.Lock()
	r.lines = append(r.lines, line)
	if len(r.lines) > r.cap {
		r.lines = r.lines[len(r.lines)-r.cap:]
	}
	r.mu.Unlock()
}

// Lines returns the buffered log lines (oldest first).
func (r *ring) Lines() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string(nil), r.lines...)
}

// Status is a point-in-time view of the server process.
type Status struct {
	Running  bool
	Attached bool
	PID      int
	Started  time.Time
	Address  string
	Uptime   time.Duration
}

// Metrics is a point-in-time sample of resource usage.
type Metrics struct {
	ProcCPUPercent float64
	ProcRSS        uint64
	SysCPUPercent  float64
	SysMemUsed     uint64
	SysMemTotal    uint64
	NumCPU         int
}

// Controller owns the server child process and its metrics sampling.
type Controller struct {
	mu       sync.Mutex
	cfg      Config
	cmd      *exec.Cmd
	pid      int
	started  time.Time
	attached bool
	running  bool
	logs     *ring

	// process-CPU sampling state
	lastTimes *gcpu.TimesStat
	lastAt    time.Time
}

// New creates a controller; call SetConfig to change the run parameters later.
func New(cfg Config) *Controller {
	return &Controller{cfg: cfg, logs: newRing(600)}
}

// SetConfig replaces the run parameters (used by the UI before Start).
func (c *Controller) SetConfig(cfg Config) {
	c.mu.Lock()
	c.cfg = cfg
	c.mu.Unlock()
}

// Logs returns the captured server console lines.
func (c *Controller) Logs() []string { return c.logs.Lines() }

// AppendLog adds a panel-authored line to the captured console.
func (c *Controller) AppendLog(line string) { c.logs.add(line) }

func (c *Controller) logf(format string, a ...any) {
	c.logs.add("[panel] " + fmt.Sprintf(format, a...))
}

// Status reports whether a server is running (owned or attached).
func (c *Controller) Status() Status {
	c.mu.Lock()
	defer c.mu.Unlock()
	st := Status{Running: c.running, Attached: c.attached, PID: c.pid, Started: c.started, Address: c.cfg.Address}
	if c.running && !c.started.IsZero() {
		st.Uptime = time.Since(c.started)
	}
	return st
}

// depotPath returns the depot dir, defaulting to "traildepot".
func (c *Controller) depotPath() string {
	if c.cfg.Depot == "" {
		return "traildepot"
	}
	return c.cfg.Depot
}

func (c *Controller) trailExe() string {
	if c.cfg.TrailPath == "" {
		return "trail"
	}
	return c.cfg.TrailPath
}

// Start brings the server up. It initialises the depot if needed, optionally
// mirrors runtime\ and migrations\, then launches `trail run`.
func (c *Controller) Start() error {
	c.mu.Lock()
	if c.running {
		c.mu.Unlock()
		return fmt.Errorf("already running (pid %d)", c.pid)
	}
	cfg := c.cfg
	c.mu.Unlock()

	depot := cfg.Depot
	if depot == "" {
		depot = "traildepot"
	}
	dataDir := filepath.Join(depot, "data")
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		c.logf("depot %s is not initialised - creating it and the admin user …", depot)
		if err := c.initDepot(cfg); err != nil {
			return err
		}
	}

	if cfg.SyncSources && cfg.SourceRoot != "" {
		if err := c.syncSources(cfg.SourceRoot, depot); err != nil {
			return err
		}
	}

	args := []string{"--depot=" + depot, "run", "--address=" + cfg.Address}
	rootFS := filepath.Join(depot, "runtime")
	args = append(args, "--runtime-root-fs="+rootFS)

	// Fail fast if something already holds the address: `waitForListen` only proves *something*
	// accepts on the port, so a `trail` that cannot bind (another instance is up) would otherwise be
	// reported as a healthy start.
	if addrInUse(cfg.Address) {
		return fmt.Errorf("address %s is already in use; stop the process holding it first", cfg.Address)
	}

	cmd := exec.Command(c.trailExe(), args...)
	cmd.Stdout = c.logs
	cmd.Stderr = c.logs
	c.logf("starting: %s %s", c.trailExe(), strings.Join(args, " "))

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start %s: %w", c.trailExe(), err)
	}

	c.mu.Lock()
	c.cmd = cmd
	c.pid = cmd.Process.Pid
	c.started = time.Now()
	c.running = true
	c.attached = false
	c.lastTimes = nil
	c.mu.Unlock()

	// Reap the process when it exits.
	go func() {
		err := cmd.Wait()
		c.mu.Lock()
		if c.cmd == cmd {
			c.running = false
			c.pid = 0
			c.cmd = nil
		}
		c.mu.Unlock()
		if err != nil {
			c.logf("server exited: %v", err)
		} else {
			c.logf("server exited")
		}
	}()

	if err := c.waitForListen(cfg.Address, 30*time.Second); err != nil {
		c.logf("warning: %v", err)
		return err
	}
	c.logf("server is listening on %s", cfg.Address)
	return nil
}

func (c *Controller) initDepot(cfg Config) error {
	cmd := exec.Command(c.trailExe(), "--depot="+cfg.Depot, "user", "change-password", cfg.AdminUser, cfg.AdminPassword)
	cmd.Stdout = c.logs
	cmd.Stderr = c.logs
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("initialise depot (is `trail` on PATH?): %w", err)
	}
	return nil
}

// syncSources mirrors runtime\, migrations\ and wasm\ into the depot, matching
// RUN.BAT: runtime is mirrored but keeps the generated `vaulter-lite` store,
// migrations are mirrored whole.
//
// wasm is mirrored on every start as well (when the source root provides it),
// not only on first seed. A rebuilt guest component (tb-ah-run-js /
// tb-ah-render-jinja) is the half of the app that a runtime/template change
// most often needs to move in lockstep with; if only runtime\ were refreshed, a
// depot seeded once would keep the previous engine and every route would fail
// on the new layout (the 2026-10-12 `template not found` outage).
func (c *Controller) syncSources(sourceRoot, depot string) error {
	c.logf("syncing runtime\\, migrations\\ and wasm\\ into %s …", depot)
	if err := mirrorDir(filepath.Join(sourceRoot, "runtime"), filepath.Join(depot, "runtime"), map[string]bool{"vaulter-lite": true}); err != nil {
		return fmt.Errorf("sync runtime: %w", err)
	}
	if err := mirrorDir(filepath.Join(sourceRoot, "migrations"), filepath.Join(depot, "migrations"), nil); err != nil {
		return fmt.Errorf("sync migrations: %w", err)
	}
	// The source layout (the panel run from trailbase\) keeps the compiled
	// components in traildepot\wasm, not beside sourceRoot, so a missing wasm\
	// under sourceRoot is not an error — the depot already holds them.
	if src := filepath.Join(sourceRoot, "wasm"); dirExists(src) {
		if err := mirrorDir(src, filepath.Join(depot, "wasm"), nil); err != nil {
			return fmt.Errorf("sync wasm: %w", err)
		}
	}
	return nil
}

// dirExists reports whether p is an existing directory.
func dirExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && st.IsDir()
}

// mirrorDir copies src into dst, deleting files in dst not present in src
// (robocopy /MIR semantics), except for a set of excluded top-level names.
func mirrorDir(src, dst string, exclude map[string]bool) error {
	if _, err := os.Stat(src); err != nil {
		return err
	}
	if err := os.MkdirAll(dst, 0o755); err != nil {
		return err
	}
	seen := map[string]bool{}
	filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		if rel == "." {
			return nil
		}
		top := strings.SplitN(filepath.ToSlash(rel), "/", 2)[0]
		if exclude != nil && exclude[top] {
			return nil
		}
		seen[rel] = true
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFile(path, target)
	})
	// delete extras
	filepath.WalkDir(dst, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		rel, _ := filepath.Rel(dst, path)
		if rel == "." {
			return nil
		}
		top := strings.SplitN(filepath.ToSlash(rel), "/", 2)[0]
		if exclude != nil && exclude[top] {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if !seen[rel] {
			os.RemoveAll(path)
			if d.IsDir() {
				return filepath.SkipDir
			}
		}
		return nil
	})
	return nil
}

func copyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

// addrInUse reports whether something already accepts a TCP connection on addr.
func addrInUse(addr string) bool {
	host, port, ok := strings.Cut(addr, ":")
	if !ok {
		host, port = "127.0.0.1", addr
	}
	if host == "0.0.0.0" || host == "" {
		host = "127.0.0.1"
	}
	conn, err := dialTimeout(host, port, 300*time.Millisecond)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// waitForListen polls the address until something accepts a TCP connection.
func (c *Controller) waitForListen(addr string, timeout time.Duration) error {
	host, port, ok := strings.Cut(addr, ":")
	if !ok {
		host, port = "127.0.0.1", addr
	}
	if host == "0.0.0.0" || host == "" {
		host = "127.0.0.1"
	}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		conn, err := dialTimeout(host, port, 500*time.Millisecond)
		if err == nil {
			conn.Close()
			return nil
		}
		if !c.Status().Running {
			return fmt.Errorf("server exited before it began listening")
		}
		time.Sleep(300 * time.Millisecond)
	}
	return fmt.Errorf("nothing is listening on %s after %s", addr, timeout)
}

// Stop terminates the child process tree.
func (c *Controller) Stop() error {
	c.mu.Lock()
	if !c.running || c.cmd == nil {
		c.mu.Unlock()
		return fmt.Errorf("not running")
	}
	pid := c.pid
	c.mu.Unlock()

	c.logf("stopping server (pid %d) …", pid)
	// taskkill /T /F takes the whole tree, which `cmd.Process.Kill` may not.
	kill := exec.Command("taskkill", "/PID", fmt.Sprint(pid), "/T", "/F")
	_ = kill.Run()
	return nil
}

// Attach finds an already-running trail server (started by RUN.BAT, say) and
// begins observing it without owning it.
func (c *Controller) Attach() (int, error) {
	procs, err := gproc.Processes()
	if err != nil {
		return 0, err
	}
	for _, p := range procs {
		name, err := p.Name()
		if err != nil {
			continue
		}
		base := strings.ToLower(name)
		if base == "trail.exe" || base == "trail" {
			pid := int(p.Pid)
			c.mu.Lock()
			c.pid = pid
			c.running = true
			c.attached = true
			c.cmd = nil
			if c.started.IsZero() {
				if ct, err := p.CreateTime(); err == nil {
					c.started = time.UnixMilli(ct)
				}
			}
			c.lastTimes = nil
			c.mu.Unlock()
			c.logf("attached to running trail.exe (pid %d)", pid)
			return pid, nil
		}
	}
	return 0, fmt.Errorf("no running trail.exe found")
}

// Sample returns current resource metrics for the tracked process (if any) and
// the machine.
func (c *Controller) Sample() Metrics {
	var m Metrics
	m.NumCPU = runtime.NumCPU()

	if vm, err := gmem.VirtualMemory(); err == nil && vm != nil {
		m.SysMemUsed, m.SysMemTotal = vm.Used, vm.Total
	}
	if pcts, err := gcpu.Percent(200*time.Millisecond, false); err == nil && len(pcts) > 0 {
		m.SysCPUPercent = pcts[0]
	}

	c.mu.Lock()
	pid := c.pid
	running := c.running
	c.mu.Unlock()
	if !running || pid == 0 {
		return m
	}
	p, err := gproc.NewProcess(int32(pid))
	if err != nil {
		return m
	}
	if mi, err := p.MemoryInfo(); err == nil && mi != nil {
		m.ProcRSS = mi.RSS
	}
	if ts, err := p.Times(); err == nil && ts != nil {
		now := time.Now()
		c.mu.Lock()
		if c.lastTimes != nil {
			dCPU := (ts.User + ts.System) - (c.lastTimes.User + c.lastTimes.System)
			dWall := now.Sub(c.lastAt).Seconds()
			if dWall > 0 {
				m.ProcCPUPercent = (dCPU / dWall) * 100
			}
		}
		c.lastTimes = ts
		c.lastAt = now
		c.mu.Unlock()
	}
	return m
}

func dialTimeout(host, port string, d time.Duration) (net.Conn, error) {
	return net.DialTimeout("tcp", net.JoinHostPort(host, port), d)
}
