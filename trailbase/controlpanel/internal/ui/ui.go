// Package ui is the go-gui control panel. One window, two tabs:
//
//   - TrailBase — start/stop/attach the server and watch the process's CPU and
//     RAM (and the machine's) plus its console output.
//   - Import   — drive the native Go v1 (PocketBase) -> TrailBase importer:
//     source/destination, the invoice_maker user, wipe/dry-run/limit, and live
//     progress, per-collection stats, verification and a log.
//
// go-gui is pure Go (no CGO) on Windows; the only CGO dependency in this binary
// is the SQLite driver.
package ui

import (
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-gui-org/go-gui/gui"
	"github.com/go-gui-org/go-gui/gui/backend"
	"github.com/go-gui-org/go-gui/gui/backend/soft"

	"aa-pos/controlpanel/internal/importer"
	"aa-pos/controlpanel/internal/monitor"
)

// Config carries resolved paths and defaults into the UI.
type Config struct {
	Depot         string
	Address       string
	Trail         string
	SourceRoot    string
	Source        string
	Dest          string
	AdminUser     string
	AdminPassword string
	SyncSources   bool
	Tab           string // initial tab: "monitor" (default) or "import"
}

// App is the window's typed state slot. It is mutated only on the frame thread
// (event callbacks and QueueCommand closures); background samplers publish into
// it through QueueCommand.
type App struct {
	// monitor controls
	Depot       string
	Address     string
	Trail       string
	SyncSources bool

	// import controls
	Source       string
	Dest         string
	Limit        string
	UserLabels   []string
	UserSelected string
	Wipe         bool
	DryRun       bool

	// live state (published by samplers)
	Status    monitor.Status
	Metrics   monitor.Metrics
	ServerLog []string
	Imp       *impView
	Msg       string
	Tab       string
}

// impView is a render-friendly copy of an importer state snapshot.
type impView struct {
	Present    bool
	Status     string
	Phase      string
	Current    string
	Done       int
	Total      int
	Rate       float64
	Errors     int
	Attributed int
	Elapsed    string
	Summary    []importer.CollectionStat
	Verify     []importer.VerifyRow
	Log        []string
}

// panel owns the runtime objects the window acts on. It is separate from App so
// the importer pointer can be guarded by its own mutex, away from the frame.
type panel struct {
	cfg  Config
	ctrl *monitor.Controller
	mu   sync.Mutex
	im   *importer.Importer
}

func (p *panel) setIm(im *importer.Importer) {
	p.mu.Lock()
	p.im = im
	p.mu.Unlock()
}

func (p *panel) getIm() *importer.Importer {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.im
}

// Run builds the window and blocks until it is closed.
func Run(cfg Config) {
	backend.Run(buildWindow(cfg))
}

// Screenshot renders the window headlessly to a PNG (used to verify the UI
// without opening a window).
func Screenshot(cfg Config, path string) error {
	return soft.RenderToPNG(buildWindow(cfg), 2, path)
}

func buildWindow(cfg Config) *gui.Window {
	p := &panel{cfg: cfg, ctrl: monitor.New(monitor.Config{
		Depot: cfg.Depot, Address: cfg.Address, TrailPath: cfg.Trail,
		AdminUser: cfg.AdminUser, AdminPassword: cfg.AdminPassword,
		SourceRoot: cfg.SourceRoot, SyncSources: cfg.SyncSources,
	})}

	st := &App{
		Depot: cfg.Depot, Address: cfg.Address, Trail: cfg.Trail, SyncSources: cfg.SyncSources,
		Source: cfg.Source, Dest: cfg.Dest, Limit: "0",
		Imp: &impView{Present: false, Status: "idle"},
		Tab: cfg.Tab,
	}
	if st.Tab == "" {
		st.Tab = "monitor"
	}

	return gui.NewWindow(gui.WindowCfg{
		State:     st,
		Title:     "AA POS — TrailBase Control Panel",
		Width:     640,
		Height:    460,
		MinWidth:  640,
		MinHeight: 460,
		MaxWidth:  640,
		MaxHeight: 460,
		FixedSize: true,
		OnInit: func(w *gui.Window) {
			w.SetTheme(compactTheme())
			bindPanel(w, p)
			w.SetView(mainView)
			startSampler(w, p)
		},
	})
}

func state(w *gui.Window) *App { return gui.State[App](w) }

// compactPad shrinks form fields so they fit the fixed-height window.
var compactPad = gui.NewPadding(3, 8, 3, 8)

// compactTheme shrinks the default theme's type and paddings so a full control
// surface fits the fixed 640x460 window.
func compactTheme() gui.Theme {
	t := gui.ThemeDark
	t.SizeTextMedium = 12
	t.SizeTextSmall = 11
	t.SizeTextXSmall = 10

	set := func(s gui.TextStyle, size float32) gui.TextStyle { s.Size = size; return s }
	t.TextStyleBody = set(t.TextStyleBody, 13)
	t.TextStyleBodySmall = set(t.TextStyleBodySmall, 12)
	t.TextStyleSecondary = set(t.TextStyleSecondary, 12)
	t.TextStyleLabel = set(t.TextStyleLabel, 12)
	t.TextStyleCaption = set(t.TextStyleCaption, 11)
	t.TextStyleCaptionSmall = set(t.TextStyleCaptionSmall, 10)
	t.TextStyleTitleSmall = set(t.TextStyleTitleSmall, 15)
	t.TextStyleTitle = set(t.TextStyleTitle, 16)
	t.TextStyleDisplay = set(t.TextStyleDisplay, 17)
	return t
}

// startSampler samples the server metrics and the import progress off the frame
// thread and publishes a combined snapshot each tick.
func startSampler(w *gui.Window, p *panel) {
	go func() {
		t := time.NewTicker(600 * time.Millisecond)
		defer t.Stop()
		for {
			select {
			case <-w.Ctx().Done():
				return
			case <-t.C:
				m := p.ctrl.Sample()
				st := p.ctrl.Status()
				logs := p.ctrl.Logs()
				iv := snapshotImport(p.getIm())
				w.QueueCommand(func(w *gui.Window) {
					a := state(w)
					a.Metrics = m
					a.Status = st
					a.ServerLog = logs
					if iv != nil {
						a.Imp = iv
					}
					w.InvalidateLayout()
				})
			}
		}
	}()
}

func snapshotImport(im *importer.Importer) *impView {
	if im == nil {
		return nil
	}
	snap := im.State().Snapshot()
	iv := &impView{
		Present: true, Status: snap.Status, Phase: snap.Phase, Current: snap.Current,
		Done: snap.Done, Total: snap.Total, Rate: snap.Rate, Errors: snap.ErrorTotal,
		Attributed: snap.Attributed, Summary: snap.Summary, Verify: snap.Verify,
	}
	for _, e := range snap.Log {
		iv.Log = append(iv.Log, e.Message)
	}
	if !snap.StartedAt.IsZero() {
		end := snap.FinishedAt
		if end.IsZero() {
			end = time.Now()
		}
		iv.Elapsed = fmtDur(end.Sub(snap.StartedAt))
	}
	return iv
}

// ---- views -----------------------------------------------------------------

func mainView(w *gui.Window) gui.View {
	a := state(w)
	return gui.TabControl(gui.TabControlCfg{
		ID:      "tabs",
		Sizing:  gui.FillFill,
		Selected: a.Tab,
		OnSelect: func(id string, ctx gui.EventCtx) { state(ctx.Window).Tab = id },
		Items: []gui.TabItemCfg{
			gui.NewTabItem("monitor", "TrailBase", monitorTab(w, a)),
			gui.NewTabItem("import", "Import", importTab(w, a)),
		},
	})
}

func monitorTab(w *gui.Window, a *App) []gui.View {
	theme := gui.CurrentTheme()

	statusText := "stopped"
	if a.Status.Running {
		statusText = "running"
		if a.Status.Attached {
			statusText = "running (attached)"
		}
	}
	uptime := "—"
	if a.Status.Uptime > 0 {
		uptime = a.Status.Uptime.Round(time.Second).String()
	}
	pid := "—"
	if a.Status.PID != 0 {
		pid = strconv.Itoa(a.Status.PID)
	}

	form := gui.Column(gui.ContainerCfg{
		ID: "mon-form", Sizing: gui.FillFit, Spacing: gui.SpacingSmall,
		Padding: theme.PaddingSmall,
		Content: []gui.View{
			gui.Text(gui.TextCfg{Text: "TrailBase server", TextStyle: theme.TextStyleTitleSmall}),
			gui.Input(gui.InputCfg{
				ID: "depot", Label: "Depot", Text: a.Depot, Sizing: gui.FillFit, TextStyle: theme.TextStyleBodySmall, Padding: compactPad,
				OnTextChanged: func(s string, _ gui.EventCtx) { state(w).Depot = s },
			}),
			gui.Row(gui.ContainerCfg{ID: "addr-row", Sizing: gui.FillFit, Spacing: gui.SpacingSmall, Content: []gui.View{
				gui.Input(gui.InputCfg{
					ID: "addr", Label: "Address", Text: a.Address, Sizing: gui.FillFit, TextStyle: theme.TextStyleBodySmall, Padding: compactPad,
					OnTextChanged: func(s string, _ gui.EventCtx) { state(w).Address = s },
				}),
				gui.Input(gui.InputCfg{
					ID: "trail", Label: "trail binary", Text: a.Trail, Sizing: gui.FillFit, TextStyle: theme.TextStyleBodySmall, Padding: compactPad,
					OnTextChanged: func(s string, _ gui.EventCtx) { state(w).Trail = s },
				}),
			}}),
			gui.Checkbox(gui.ToggleCfg{
				ID: "sync", Label: "Sync runtime + migrations before start", Selected: a.SyncSources,
				OnClick: func(ctx gui.EventCtx) {
					state(ctx.Window).SyncSources = !state(ctx.Window).SyncSources
					ctx.Consume()
				},
			}),
			gui.Row(gui.ContainerCfg{ID: "mon-btns", Spacing: gui.SpacingSmall, Content: []gui.View{
				gui.Button(gui.ButtonCfg{ID: "start", Label: "Start", OnClick: func(ctx gui.EventCtx) {
					a := state(ctx.Window)
					p := panelOf(ctx.Window)
					p.ctrl.SetConfig(monitor.Config{
						Depot: a.Depot, Address: a.Address, TrailPath: a.Trail,
						AdminUser: p.cfg.AdminUser, AdminPassword: p.cfg.AdminPassword,
						SourceRoot: p.cfg.SourceRoot, SyncSources: a.SyncSources,
					})
					a.Msg = "starting …"
					go func() {
						if err := p.ctrl.Start(); err != nil {
							p.ctrl.AppendLog("start failed: " + err.Error())
						}
					}()
					ctx.Consume()
				}}),
				gui.Button(gui.ButtonCfg{ID: "stop", Label: "Stop", OnClick: func(ctx gui.EventCtx) {
					if err := panelOf(ctx.Window).ctrl.Stop(); err != nil {
						state(ctx.Window).Msg = "stop: " + err.Error()
					}
					ctx.Consume()
				}}),
				gui.Button(gui.ButtonCfg{ID: "attach", Label: "Attach", OnClick: func(ctx gui.EventCtx) {
					if _, err := panelOf(ctx.Window).ctrl.Attach(); err != nil {
						state(ctx.Window).Msg = "attach: " + err.Error()
					}
					ctx.Consume()
				}}),
				gui.Button(gui.ButtonCfg{ID: "open", Label: "Open", OnClick: func(ctx gui.EventCtx) {
					openBrowser("http://" + panelOf(ctx.Window).ctrl.Status().Address)
					ctx.Consume()
				}}),
			}}),
			gui.Separator(gui.SeparatorCfg{}),
			gui.Row(gui.ContainerCfg{ID: "m1", Sizing: gui.FillFit, Spacing: gui.SpacingSmall, Content: []gui.View{
				kv("Status", statusText, theme), kv("PID", pid, theme)}}),
			gui.Row(gui.ContainerCfg{ID: "m2", Sizing: gui.FillFit, Spacing: gui.SpacingSmall, Content: []gui.View{
				kv("Uptime", uptime, theme), kv("CPU", fmt.Sprintf("%.1f %%", a.Metrics.ProcCPUPercent), theme)}}),
			gui.Row(gui.ContainerCfg{ID: "m3", Sizing: gui.FillFit, Spacing: gui.SpacingSmall, Content: []gui.View{
				kv("Server RAM", humanBytes(a.Metrics.ProcRSS), theme), kv("Machine CPU", fmt.Sprintf("%.1f %%", a.Metrics.SysCPUPercent), theme)}}),
			kv("Machine RAM", sysMemText(a.Metrics), theme),
			msgText(a.Msg, theme),
		},
	})

	return []gui.View{gui.Column(gui.ContainerCfg{ID: "mon-body", Sizing: gui.FillFill, Scrollable: true, Spacing: gui.SpacingTight, Padding: theme.PaddingSmall, Content: []gui.View{
		form,
		gui.Text(gui.TextCfg{Text: "Server console", TextStyle: theme.TextStyleSecondary}),
		gui.ListBox(gui.ListBoxCfg{ID: "serverlog", Items: tailReversed(a.ServerLog, 300), Sizing: gui.FillFit, Height: 118}),
	}})}
}

func importTab(w *gui.Window, a *App) []gui.View {
	theme := gui.CurrentTheme()

	pct := float32(0)
	if a.Imp != nil && a.Imp.Total > 0 {
		pct = float32(a.Imp.Done) / float32(a.Imp.Total)
		if pct > 1 {
			pct = 1
		}
	}
	impStatus := "idle"
	records := "—"
	rate := "—"
	current := "—"
	errs := "0"
	if a.Imp != nil && a.Imp.Present {
		impStatus = a.Imp.Status
		if a.Imp.Phase != "" {
			impStatus += " · " + a.Imp.Phase
		}
		if a.Imp.Total > 0 {
			records = fmt.Sprintf("%d / %d", a.Imp.Done, a.Imp.Total)
		}
		rate = fmtSpeed(a.Imp.Rate)
		if a.Imp.Current != "" {
			current = a.Imp.Current
		}
		if a.Imp.Elapsed != "" {
			current += "   " + a.Imp.Elapsed
		}
		errs = strconv.Itoa(a.Imp.Errors)
	}

	form := gui.Column(gui.ContainerCfg{
		ID: "imp-form", Sizing: gui.FillFit, Spacing: gui.SpacingSmall,
		Padding: theme.PaddingSmall,
		Content: []gui.View{
			gui.Text(gui.TextCfg{Text: "Source and destination", TextStyle: theme.TextStyleTitleSmall}),
			browseRow(w, "source", "Source (PocketBase data.db)", a.Source, true),
			browseRow(w, "dest", "Destination (main.db)", a.Dest, false),
			gui.Select(gui.SelectCfg{
				ID: "user", Label: "Attribute invoice_maker to", TextStyle: theme.TextStyleBodySmall, Padding: compactPad,
				Items: a.UserLabels, Selected: selectedList(a.UserSelected),
				OnSelect: func(sel []string, ctx gui.EventCtx) {
					if len(sel) > 0 {
						state(ctx.Window).UserSelected = sel[0]
					}
					ctx.Consume()
				},
			}),
			gui.Input(gui.InputCfg{ID: "limit", Label: "Limit per collection (0 = all)", Text: a.Limit, Sizing: gui.FillFit, TextStyle: theme.TextStyleBodySmall, Padding: compactPad,
				OnTextChanged: func(s string, _ gui.EventCtx) { state(w).Limit = s }}),
			gui.Checkbox(gui.ToggleCfg{ID: "dryrun", Label: "Dry run (read and map only)", Selected: a.DryRun,
				OnClick: func(ctx gui.EventCtx) { state(ctx.Window).DryRun = !state(ctx.Window).DryRun; ctx.Consume() }}),
			gui.Checkbox(gui.ToggleCfg{ID: "wipe", Label: "Wipe business tables first (keeps _user)", Selected: a.Wipe,
				OnClick: func(ctx gui.EventCtx) { state(ctx.Window).Wipe = !state(ctx.Window).Wipe; ctx.Consume() }}),
			gui.Row(gui.ContainerCfg{ID: "imp-btns", Spacing: gui.SpacingSmall, Content: []gui.View{
				gui.Button(gui.ButtonCfg{ID: "load", Label: "Load users", OnClick: func(ctx gui.EventCtx) {
					loadUsers(ctx.Window)
					ctx.Consume()
				}}),
				gui.Button(gui.ButtonCfg{ID: "imp-start", Label: "Start import", OnClick: func(ctx gui.EventCtx) {
					startImport(ctx.Window)
					ctx.Consume()
				}}),
				gui.Button(gui.ButtonCfg{ID: "imp-stop", Label: "Stop", OnClick: func(ctx gui.EventCtx) {
					if im := panelOf(ctx.Window).getIm(); im != nil {
						im.Stop()
					}
					ctx.Consume()
				}}),
			}}),
			gui.Separator(gui.SeparatorCfg{}),
			gui.ProgressBar(gui.ProgressBarCfg{ID: "progress", Percent: pct, TextShow: true}),
			gui.Row(gui.ContainerCfg{ID: "i1", Sizing: gui.FillFit, Spacing: gui.SpacingSmall, Content: []gui.View{
				kv("Status", impStatus, theme), kv("Records", records, theme)}}),
			gui.Row(gui.ContainerCfg{ID: "i2", Sizing: gui.FillFit, Spacing: gui.SpacingSmall, Content: []gui.View{
				kv("Speed", rate, theme), kv("Errors", errs, theme)}}),
			kv("Current", current, theme),
			kv("Attributed", attributedText(a), theme),
			msgText(a.Msg, theme),
			gui.Separator(gui.SeparatorCfg{}),
			gui.Text(gui.TextCfg{Text: "Per-collection", TextStyle: theme.TextStyleSecondary}),
			gui.Table(gui.TableCfg{ID: "summary", RawData: summaryRows(a), Sizing: gui.FitFit, Height: 92,
				SizeBorder: 1, SizeBorderHeader: 1, FreezeHeader: true}),
			gui.Text(gui.TextCfg{Text: "Verification", TextStyle: theme.TextStyleSecondary}),
			gui.ListBox(gui.ListBoxCfg{ID: "verify", Items: verifyLines(a), Sizing: gui.FillFit, Height: 56}),
		},
	})

	return []gui.View{gui.Column(gui.ContainerCfg{ID: "imp-body", Sizing: gui.FillFill, Scrollable: true, Spacing: gui.SpacingTight, Padding: theme.PaddingSmall, Content: []gui.View{
		form,
		gui.Text(gui.TextCfg{Text: "Log", TextStyle: theme.TextStyleSecondary}),
		gui.ListBox(gui.ListBoxCfg{ID: "implog", Items: importLog(a), Sizing: gui.FillFit, Height: 130}),
	}})}
}

// ---- actions ---------------------------------------------------------------

func loadUsers(w *gui.Window) {
	a := state(w)
	p := panelOf(w)
	src, dst := a.Source, a.Dest
	a.Msg = "loading users …"
	go func() {
		im := importer.New(importer.Options{Source: src, Dest: dst})
		if err := im.Open(); err != nil {
			w.QueueCommand(func(w *gui.Window) { state(w).Msg = "load users: " + err.Error() })
			return
		}
		var labels []string
		for _, u := range im.Users() {
			labels = append(labels, u.Label())
		}
		im.Close()
		w.QueueCommand(func(w *gui.Window) {
			a := state(w)
			a.UserLabels = labels
			if len(labels) > 0 {
				a.UserSelected = labels[0]
				a.Msg = fmt.Sprintf("loaded %d user(s)", len(labels))
			} else {
				a.Msg = "no _user rows (invoice_maker will be NULL)"
			}
		})
	}()
	_ = p
}

func startImport(w *gui.Window) {
	a := state(w)
	p := panelOf(w)
	limit, _ := strconv.Atoi(strings.TrimSpace(a.Limit))
	user := ""
	for i, l := range a.UserLabels {
		if l == a.UserSelected {
			user = strconv.Itoa(i)
			break
		}
	}
	opts := importer.Options{Source: a.Source, Dest: a.Dest, User: user, Wipe: a.Wipe, DryRun: a.DryRun, Limit: limit}
	a.Msg = "starting import …"
	go func() {
		im := importer.New(opts)
		if err := im.Open(); err != nil {
			w.QueueCommand(func(w *gui.Window) { state(w).Msg = "start import: " + err.Error() })
			return
		}
		p.setIm(im)
		w.QueueCommand(func(w *gui.Window) { state(w).Msg = "" })
		im.Run()
	}()
}

// panelOf retrieves the panel bound to the window via a registry keyed by the
// window pointer. go-gui's window state slot is typed per struct, so the panel
// (which holds mutexes and the controller) lives in a package map instead.
var (
	panelMu    sync.Mutex
	panelByWin = map[*gui.Window]*panel{}
)

func bindPanel(w *gui.Window, p *panel) {
	panelMu.Lock()
	panelByWin[w] = p
	panelMu.Unlock()
}

func panelOf(w *gui.Window) *panel {
	panelMu.Lock()
	defer panelMu.Unlock()
	return panelByWin[w]
}

// ---- helpers ---------------------------------------------------------------

// browseRow is a path field with a "Browse…" button that opens the native
// open-file dialog, filtered to SQLite databases.
func browseRow(w *gui.Window, id, label, val string, isSource bool) gui.View {
	get := func(win *gui.Window) string {
		if isSource {
			return state(win).Source
		}
		return state(win).Dest
	}
	set := func(win *gui.Window, s string) {
		if isSource {
			state(win).Source = s
		} else {
			state(win).Dest = s
		}
	}
	input := gui.Input(gui.InputCfg{
		ID: id, Label: label, Text: val, Sizing: gui.FillFit,
		TextStyle:     gui.CurrentTheme().TextStyleBodySmall, Padding: compactPad,
		OnTextChanged: func(s string, _ gui.EventCtx) { set(w, s) },
	})
	btn := gui.Button(gui.ButtonCfg{ID: id + "-browse", Label: "Browse…", OnClick: func(ctx gui.EventCtx) {
		win := ctx.Window
		win.NativeOpenDialog(gui.NativeOpenDialogCfg{
			Title:    "Select " + label,
			StartDir: dirOf(get(win)),
			Filters:  []gui.NativeFileFilter{{Name: "SQLite database", Extensions: []string{"db", "sqlite", "sqlite3"}}},
			OnDone: func(res gui.NativeDialogResult, dw *gui.Window) {
				if res.Status == gui.DialogOK {
					if ps := res.PathStrings(); len(ps) > 0 {
						set(dw, ps[0])
					}
				}
			},
		})
		ctx.Consume()
	}})
	return gui.Row(gui.ContainerCfg{ID: id + "-row", Sizing: gui.FillFit, Spacing: gui.SpacingSmall, Content: []gui.View{input, btn}})
}

func dirOf(p string) string {
	d := filepath.Dir(p)
	if st, err := os.Stat(d); err == nil && st.IsDir() {
		return d
	}
	return ""
}
func kv(k, v string, theme gui.Theme) gui.View {
	return gui.Row(gui.ContainerCfg{Sizing: gui.FillFit, Spacing: gui.SpacingSmall, Content: []gui.View{
		gui.Text(gui.TextCfg{Text: k + ":", TextStyle: theme.TextStyleSecondary, Sizing: gui.FitFit}),
		gui.Text(gui.TextCfg{Text: v, TextStyle: theme.TextStyleBodySmall}),
	}})
}

func attributedText(a *App) string {
	if a.Imp != nil {
		return strconv.Itoa(a.Imp.Attributed)
	}
	return "0"
}

func msgText(msg string, theme gui.Theme) gui.View {
	if msg == "" {
		return gui.Text(gui.TextCfg{Text: "", TextStyle: theme.TextStyleSecondary})
	}
	return gui.Text(gui.TextCfg{Text: msg, TextStyle: theme.TextStyleSecondary})
}

func selectedList(s string) []string {
	if s == "" {
		return nil
	}
	return []string{s}
}

func summaryRows(a *App) [][]string {
	rows := [][]string{{"collection", "read", "created", "failed", "links"}}
	if a.Imp != nil {
		for _, s := range a.Imp.Summary {
			name := s.Name
			if s.Absent {
				name += " (absent)"
			}
			rows = append(rows, []string{
				name, strconv.Itoa(s.Read), strconv.Itoa(s.Created), strconv.Itoa(s.Failed), strconv.Itoa(s.Links),
			})
		}
	}
	return rows
}

func verifyLines(a *App) []string {
	if a.Imp == nil || len(a.Imp.Verify) == 0 {
		return []string{"(not yet run)"}
	}
	var out []string
	for _, v := range a.Imp.Verify {
		mark := "ok      "
		if !v.OK || !v.DateOK {
			mark = "MISMATCH"
		}
		out = append(out, fmt.Sprintf("%s %-26s source %d / dest %d", mark, v.Table, v.Source, v.Dest))
	}
	return out
}

func importLog(a *App) []string {
	if a.Imp == nil {
		return nil
	}
	return a.Imp.Log // already newest-first
}

func tailReversed(lines []string, n int) []string {
	if len(lines) <= n {
		// newest at top for readability
		out := make([]string, len(lines))
		for i, l := range lines {
			out[len(lines)-1-i] = l
		}
		return out
	}
	lines = lines[len(lines)-n:]
	out := make([]string, len(lines))
	for i, l := range lines {
		out[len(lines)-1-i] = l
	}
	return out
}

func sysMemText(m monitor.Metrics) string {
	if m.SysMemTotal == 0 {
		return "—"
	}
	return fmt.Sprintf("%s / %s (%.0f%%)", humanBytes(m.SysMemUsed), humanBytes(m.SysMemTotal),
		100*float64(m.SysMemUsed)/float64(m.SysMemTotal))
}

func humanBytes(b uint64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := uint64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGT"[exp])
}

func fmtSpeed(rate float64) string {
	if rate <= 0 {
		return "—"
	}
	if rate >= 1 {
		return fmt.Sprintf("%.0f rec/s", rate)
	}
	return fmt.Sprintf("%.1f s/rec", 1/rate)
}

func fmtDur(d time.Duration) string {
	if d < 0 {
		return "—"
	}
	s := d.Seconds()
	if s < 60 {
		return fmt.Sprintf("%.1fs", s)
	}
	return fmt.Sprintf("%dm %02ds", int(s)/60, int(s)%60)
}

func openBrowser(raw string) {
	u, err := url.Parse(raw)
	if err != nil {
		return
	}
	switch runtime.GOOS {
	case "windows":
		_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", u.String()).Start()
	case "darwin":
		_ = exec.Command("open", u.String()).Start()
	default:
		_ = exec.Command("xdg-open", u.String()).Start()
	}
}
