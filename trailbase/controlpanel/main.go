// Command controlpanel is the AA Point of Sale TrailBase control panel: a Fyne
// GUI that (1) starts, stops and monitors the TrailBase server (CPU/RAM) and
// (2) drives the native Go v1 (PocketBase) -> TrailBase importer with live
// controls and status. Run with --cli for a headless import (scriptable/CI).
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"aa-pos/controlpanel/internal/importer"
	"aa-pos/controlpanel/internal/ui"
)

func main() {
	var (
		cli        = flag.Bool("cli", false, "run the importer headlessly and exit")
		source     = flag.String("source", "", "PocketBase data.db (source)")
		dest       = flag.String("dest", "", "TrailBase main.db (destination)")
		user       = flag.String("user", "", "attribute invoice_maker to: index|email|username|hex id")
		wipe       = flag.Bool("wipe", false, "clear destination business tables before importing")
		dryRun     = flag.Bool("dry-run", false, "read and map only; write nothing")
		limit      = flag.Int("limit", 0, "import at most N rows per collection (testing)")
		depot      = flag.String("depot", "", "TrailBase depot directory (GUI)")
		address    = flag.String("address", "127.0.0.1:4000", "bind address (GUI)")
		trail      = flag.String("trail", "trail", "path to the trail binary (GUI)")
		sourceRoot = flag.String("source-root", "", "the trailbase dir holding runtime\\ and migrations\\ (GUI)")
		screenshot = flag.String("screenshot", "", "render the GUI to a PNG and exit (headless check)")
		tab        = flag.String("tab", "monitor", "initial tab: monitor or import")
	)
	flag.Parse()

	root := findRepoRoot()
	if root == "" {
		root, _ = os.Getwd()
	}

	defSource := filepath.Join(root, "legacyforparity", "backend", "pb_data", "data.db")
	defTB := filepath.Join(root, "trailbase")
	defDepot := filepath.Join(defTB, "traildepot")
	defDest := filepath.Join(defDepot, "data", "main.db")
	if *sourceRoot == "" {
		*sourceRoot = defTB
	}
	if *depot == "" {
		*depot = defDepot
	}
	if *source == "" {
		*source = defSource
	}
	if *dest == "" {
		*dest = defDest
	}

	if *cli {
		os.Exit(runCLI(*source, *dest, *user, *wipe, *dryRun, *limit))
	}

	uiCfg := ui.Config{
		Depot:         *depot,
		Address:       *address,
		Trail:         *trail,
		SourceRoot:    *sourceRoot,
		Source:        *source,
		Dest:          *dest,
		AdminUser:     "admin@localhost",
		AdminPassword: "administrator-0ne",
		SyncSources:   true,
		Tab:           *tab,
	}

	if *screenshot != "" {
		if err := ui.Screenshot(uiCfg, *screenshot); err != nil {
			fmt.Fprintln(os.Stderr, "screenshot:", err)
			os.Exit(1)
		}
		fmt.Println("wrote", *screenshot)
		return
	}

	ui.Run(uiCfg)
}

func runCLI(source, dest, user string, wipe, dryRun bool, limit int) int {
	im := importer.New(importer.Options{
		Source: source, Dest: dest, User: user,
		Wipe: wipe, DryRun: dryRun, Limit: limit,
	})
	if err := im.Open(); err != nil {
		fmt.Fprintln(os.Stderr, "cannot start:", err)
		return 1
	}
	defer im.Close()
	if len(im.Users()) > 0 {
		fmt.Println("invoice_maker ->", im.MakerLabel())
	} else {
		fmt.Println("invoice_maker -> (no _user rows; NULL)")
	}
	im.Run()
	st := im.State().Snapshot()

	fmt.Printf("\nimport %s\n", st.Status)
	fmt.Printf("%-30s%8s%9s%8s%7s\n", "collection", "read", "created", "failed", "links")
	for _, s := range st.Summary {
		if s.Absent {
			continue
		}
		fmt.Printf("%-30s%8d%9d%8d%7d\n", s.Name, s.Read, s.Created, s.Failed, s.Links)
	}
	for _, e := range st.Errors {
		fmt.Println("  " + e)
	}
	for _, r := range st.Verify {
		mark := "ok"
		if !r.OK || !r.DateOK {
			mark = "MISMATCH"
		}
		fmt.Printf("  %-8s %-26s source %d / dest %d\n", mark, r.Table, r.Source, r.Dest)
	}
	if st.ErrorTotal > 0 || st.Status == "failed" {
		return 1
	}
	return 0
}

// findRepoRoot walks up from the executable and the working directory looking
// for the directory that holds both `trailbase` and `legacyforparity`.
func findRepoRoot() string {
	starts := []string{}
	if exe, err := os.Executable(); err == nil {
		starts = append(starts, filepath.Dir(exe))
	}
	if wd, err := os.Getwd(); err == nil {
		starts = append(starts, wd)
	}
	for _, s := range starts {
		dir := s
		for {
			if isDir(filepath.Join(dir, "trailbase")) && isDir(filepath.Join(dir, "legacyforparity")) {
				return dir
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
	}
	return ""
}

func isDir(p string) bool {
	st, err := os.Stat(p)
	return err == nil && st.IsDir()
}
