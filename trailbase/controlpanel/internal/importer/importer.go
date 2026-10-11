package importer

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	sqlite3 "github.com/mattn/go-sqlite3"
)

const driverName = "sqlite3_aa"

var (
	registerOnce sync.Once
	registerErr  error
)

// registerDriver installs a SQLite driver that registers the TrailBase SQL
// functions a plain connection lacks. The destination schema's
// CHECK (is_uuid_v7(id)) and DEFAULT (uuid_v7()) reference them, so an insert
// through a bare connection would fail without this.
func registerDriver() error {
	registerOnce.Do(func() {
		sql.Register(driverName, &sqlite3.SQLiteDriver{
			ConnectHook: func(c *sqlite3.SQLiteConn) error {
				if err := c.RegisterFunc("is_uuid_v7", func(b []byte) int {
					if len(b) == 16 && (b[6]>>4) == 7 {
						return 1
					}
					return 0
				}, true); err != nil {
					return err
				}
				if err := c.RegisterFunc("uuid_v7", func() []byte { return gen.next(0) }, false); err != nil {
					return err
				}
				if err := c.RegisterFunc("is_uuid", func(b []byte) int {
					if len(b) == 16 {
						return 1
					}
					return 0
				}, true); err != nil {
					return err
				}
				if err := c.RegisterFunc("uuid_v4", func() []byte { return gen.next(0) }, false); err != nil {
					return err
				}
				return nil
			},
		})
	})
	return registerErr
}

// Options configure a single import run.
type Options struct {
	Source      string
	Dest        string
	User        string // index | email | username | hex id (default: first user)
	Wipe        bool
	DryRun      bool
	Limit       int
	AllowNoUser bool
}

// User is one row of the destination's `_user` table.
type User struct {
	ID       []byte
	Email    string
	Username string
	Created  string
}

func (u User) Label() string {
	name := u.Email
	if name == "" {
		name = u.Username
	}
	if name == "" {
		name = "(no email)"
	}
	return name
}

func hexID(b []byte) string {
	const hx = "0123456789abcdef"
	var sb strings.Builder
	for _, c := range b {
		sb.WriteByte(hx[c>>4])
		sb.WriteByte(hx[c&0x0f])
	}
	return sb.String()
}

// CollectionStat is one row of the per-collection progress/summary table.
type CollectionStat struct {
	Name    string
	Read    int
	Created int
	Failed  int
	Links   int
	Absent  bool
}

// VerifyRow is one row of the post-import verification.
type VerifyRow struct {
	Table  string
	Source int
	Dest   int
	OK     bool
	SrcMin string
	DstMin string
	DateOK bool
	Seeded int
}

// LogEntry is one line of the run log.
type LogEntry struct {
	Level   string // info | warn | error
	Message string
	At      time.Time
}

// State is the live, observable state of an import. It is guarded by a mutex;
// callers read it through Snapshot.
type State struct {
	mu         sync.Mutex
	Status     string
	Phase      string
	Message    string
	Current    string
	Done       int
	Total      int
	Rate       float64
	StartedAt  time.Time
	FinishedAt time.Time
	Summary    []CollectionStat
	Log        []LogEntry
	Errors     []string
	ErrorTotal int
	Attributed int
	Verify     []VerifyRow

	stopping bool
}

// Snapshot is a copy safe to read from another goroutine. The mutex is not
// copied; the fields are enumerated so go vet's copylocks check stays quiet.
func (s *State) Snapshot() State {
	s.mu.Lock()
	defer s.mu.Unlock()
	return State{
		Status:     s.Status,
		Phase:      s.Phase,
		Message:    s.Message,
		Current:    s.Current,
		Done:       s.Done,
		Total:      s.Total,
		Rate:       s.Rate,
		StartedAt:  s.StartedAt,
		FinishedAt: s.FinishedAt,
		Summary:    append([]CollectionStat(nil), s.Summary...),
		Log:        append([]LogEntry(nil), s.Log...),
		Errors:     append([]string(nil), s.Errors...),
		ErrorTotal: s.ErrorTotal,
		Attributed: s.Attributed,
		Verify:     append([]VerifyRow(nil), s.Verify...),
		stopping:   s.stopping,
	}
}

type Importer struct {
	opts  Options
	state *State

	mu     sync.Mutex
	source *sql.DB
	dest   *sql.DB

	srcCounts map[string]int
	absent    map[string]bool
	maker     []byte
	makerLbl  string
	users     []User

	rateBuf []rateSample
}

type rateSample struct {
	t    time.Time
	done int
}

func New(opts Options) *Importer {
	return &Importer{
		opts:      opts,
		state:     &State{Status: "idle", Summary: []CollectionStat{}},
		absent:    map[string]bool{},
		srcCounts: map[string]int{},
	}
}

func (im *Importer) State() *State { return im.state }

func (im *Importer) log(level, msg string) {
	im.state.mu.Lock()
	defer im.state.mu.Unlock()
	im.state.Log = append([]LogEntry{{Level: level, Message: msg, At: time.Now()}}, im.state.Log...)
	if len(im.state.Log) > 400 {
		im.state.Log = im.state.Log[:400]
	}
}

func (im *Importer) errf(collection, id, msg string) {
	im.state.mu.Lock()
	defer im.state.mu.Unlock()
	im.state.ErrorTotal++
	if len(im.state.Errors) < 500 {
		if id != "" {
			im.state.Errors = append(im.state.Errors, fmt.Sprintf("[%s %s] %s", collection, id, msg))
		} else {
			im.state.Errors = append(im.state.Errors, fmt.Sprintf("[%s] %s", collection, msg))
		}
	}
}

func fileExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

func sourceDSN(path string) string {
	// Absolute, forward-slashed, read-only URI so the oracle can never be written.
	p := filepath.ToSlash(path)
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	return "file://" + p + "?mode=ro"
}

func destDSN(path string) string {
	return path + "?_busy_timeout=15000&_foreign_keys=on"
}

// sameFile reports whether two paths name the same physical file. A raw string
// compare is not enough on Windows, where a case difference, a relative spelling
// or a `..` segment can hide that source and destination are the same database —
// running `--wipe` then destroys the file the loader is about to read.
func sameFile(a, b string) bool {
	if a == b {
		return true
	}
	if ai, err := os.Stat(a); err == nil {
		if bi, err := os.Stat(b); err == nil {
			return os.SameFile(ai, bi)
		}
	}
	absA, errA := filepath.Abs(a)
	absB, errB := filepath.Abs(b)
	if errA != nil || errB != nil {
		return false
	}
	absA, absB = filepath.Clean(absA), filepath.Clean(absB)
	if runtime.GOOS == "windows" {
		return strings.EqualFold(absA, absB)
	}
	return absA == absB
}

// backupDest copies the destination database to a timestamped sibling before a
// destructive `--wipe`, so a crash mid-import cannot leave the depot unrecoverable.
func (im *Importer) backupDest() {
	src, err := os.Open(im.opts.Dest)
	if err != nil {
		im.log("warn", fmt.Sprintf("could not open destination for backup: %v", err))
		return
	}
	defer src.Close()
	backup := fmt.Sprintf("%s.pre-import-%s.bak", im.opts.Dest, time.Now().Format("20060102-150405"))
	dst, err := os.Create(backup)
	if err != nil {
		im.log("warn", fmt.Sprintf("could not create backup %s: %v", backup, err))
		return
	}
	if _, err := io.Copy(dst, src); err != nil {
		dst.Close()
		im.log("warn", fmt.Sprintf("backup copy failed: %v", err))
		return
	}
	if err := dst.Close(); err != nil {
		im.log("warn", fmt.Sprintf("backup close failed: %v", err))
		return
	}
	im.log("info", fmt.Sprintf("Backed up %s to %s before wiping.", im.opts.Dest, backup))
}

// Open validates the paths, opens both databases, loads the destination users
// and verifies that the source and destination schemas carry the tables and
// columns this plan writes. It refuses to run on a schema mismatch.
func (im *Importer) Open() error {
	if err := registerDriver(); err != nil {
		return fmt.Errorf("register sqlite driver: %w", err)
	}
	if sameFile(im.opts.Source, im.opts.Dest) {
		return errors.New("source and destination are the same file; refusing")
	}
	if !fileExists(im.opts.Source) {
		return fmt.Errorf("source database not found: %s", im.opts.Source)
	}
	if !fileExists(im.opts.Dest) {
		return fmt.Errorf("destination depot database not found: %s (start TrailBase once to create it)", im.opts.Dest)
	}

	src, err := sql.Open(driverName, sourceDSN(im.opts.Source))
	if err != nil {
		return fmt.Errorf("open source: %w", err)
	}
	src.SetMaxOpenConns(1)
	if err := src.Ping(); err != nil {
		src.Close()
		return fmt.Errorf("read source: %w", err)
	}

	dst, err := sql.Open(driverName, destDSN(im.opts.Dest))
	if err != nil {
		src.Close()
		return fmt.Errorf("open destination: %w", err)
	}
	dst.SetMaxOpenConns(1)
	if err := dst.Ping(); err != nil {
		src.Close()
		dst.Close()
		return fmt.Errorf("open destination: %w", err)
	}

	im.source, im.dest = src, dst

	if err := im.validateSchemas(); err != nil {
		im.Close()
		return err
	}

	rows, err := dst.Query("SELECT id, COALESCE(email,''), COALESCE(username,''), COALESCE(created,'') FROM _user ORDER BY created, rowid")
	if err != nil {
		im.Close()
		return fmt.Errorf("read destination _user: %w", err)
	}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Username, &u.Created); err != nil {
			rows.Close()
			im.Close()
			return err
		}
		im.users = append(im.users, u)
	}
	rows.Close()
	if len(im.users) == 0 {
		im.log("warn", "destination has no _user rows; invoice_maker will be imported as NULL. Create a user or pick one.")
	}
	if err := im.selectUser(im.opts.User); err != nil {
		im.Close()
		return err
	}
	return nil
}

// selectUser resolves the --user selector against the destination's users.
func (im *Importer) selectUser(sel string) error {
	if len(im.users) == 0 {
		im.maker = nil
		im.makerLbl = "(none)"
		return nil
	}
	u := im.users[0]
	if sel != "" {
		found := false
		if n, err := parseInt(sel); err == nil && n >= 0 && n < len(im.users) {
			u, found = im.users[n], true
		}
		if !found {
			low := strings.ToLower(sel)
			for _, cand := range im.users {
				if strings.ToLower(cand.Email) == low || strings.ToLower(cand.Username) == low {
					u, found = cand, true
					break
				}
			}
		}
		if !found {
			clean := strings.ToLower(strings.NewReplacer("-", "", " ", "", "}", "", "{", "").Replace(sel))
			for _, cand := range im.users {
				if strings.HasPrefix(hexID(cand.ID), clean) || hexID(cand.ID) == clean {
					u, found = cand, true
					break
				}
			}
		}
		if !found {
			return fmt.Errorf("user %q did not match any _user row (by index, email, username or hex id)", sel)
		}
	}
	im.maker = u.ID
	im.makerLbl = u.Label()
	return nil
}

func parseInt(s string) (int, error) {
	n := 0
	if s == "" {
		return 0, errors.New("empty")
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return 0, errors.New("not a number")
		}
		n = n*10 + int(r-'0')
	}
	return n, nil
}

// Users returns the destination users for a picker.
func (im *Importer) Users() []User { return im.users }

// MakerLabel is the resolved attribution target.
func (im *Importer) MakerLabel() string { return im.makerLbl }

// validateSchemas ensures the source has every table we read and the
// destination has every table and column we write. A missing source table is
// recorded as absent (skipped); a missing destination column is fatal.
func (im *Importer) validateSchemas() error {
	srcTables, err := tableColumns(im.source)
	if err != nil {
		return err
	}
	dstTables, err := tableColumns(im.dest)
	if err != nil {
		return err
	}
	im.state.Summary = nil
	for _, st := range plan {
		stat := CollectionStat{Name: st.Source}
		if _, ok := srcTables[st.Source]; !ok {
			stat.Absent = true
			im.absent[st.Source] = true
			im.log("warn", fmt.Sprintf("%s: not present in the source database, will be skipped.", st.Source))
		}
		im.state.Summary = append(im.state.Summary, stat)

		cols, ok := dstTables[st.Table]
		if !ok {
			return fmt.Errorf("destination is missing table %q required by source %q", st.Table, st.Source)
		}
		for _, want := range st.Columns {
			if !cols[want] {
				return fmt.Errorf("destination table %q is missing column %q (schema drift; the depot was built from a different migration set)", st.Table, want)
			}
		}
		for _, l := range st.Links {
			lc, ok := dstTables[l.Table]
			if !ok {
				return fmt.Errorf("destination is missing link table %q", l.Table)
			}
			for _, want := range []string{"id", l.Self, l.Other, "created", "updated"} {
				if !lc[want] {
					return fmt.Errorf("destination link table %q is missing column %q", l.Table, want)
				}
			}
		}
	}
	return nil
}

func tableColumns(db *sql.DB) (map[string]map[string]bool, error) {
	rows, err := db.Query("SELECT name FROM sqlite_master WHERE type='table'")
	if err != nil {
		return nil, err
	}
	var names []string
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			rows.Close()
			return nil, err
		}
		names = append(names, n)
	}
	rows.Close()

	out := map[string]map[string]bool{}
	for _, n := range names {
		cols, err := db.Query(fmt.Sprintf("PRAGMA table_info(%q)", n))
		if err != nil {
			return nil, err
		}
		set := map[string]bool{}
		for cols.Next() {
			var cid int
			var name, typ string
			var notnull, pk int
			var dflt sql.NullString
			if err := cols.Scan(&cid, &name, &typ, &notnull, &dflt, &pk); err != nil {
				cols.Close()
				return nil, err
			}
			set[name] = true
		}
		cols.Close()
		out[n] = set
	}
	return out, nil
}

func tableExists(db *sql.DB, name string) (bool, error) {
	var n int
	err := db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", name).Scan(&n)
	return n > 0, err
}

// requestStop asks a running import to stop after the current batch.
func (im *Importer) requestStop() {
	im.state.mu.Lock()
	im.state.stopping = true
	im.state.mu.Unlock()
}

func (im *Importer) stopped() bool {
	im.state.mu.Lock()
	defer im.state.mu.Unlock()
	return im.state.stopping
}

func (im *Importer) Close() {
	if im.source != nil {
		im.source.Close()
		im.source = nil
	}
	if im.dest != nil {
		im.dest.Close()
		im.dest = nil
	}
}
