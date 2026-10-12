package sfx

import (
	"os"
	"path/filepath"
	"testing"
	"testing/fstest"
)

func sampleFS() fstest.MapFS {
	return fstest.MapFS{
		"payload/trail.exe":         {Data: []byte("TRAIL")},
		"payload/config.textproto":  {Data: []byte("cfg")},
		"payload/runtime/app/x.js":  {Data: []byte("js")},
		"payload/migrations/U1.sql": {Data: []byte("sql")},
		"payload/.gitkeep":          {Data: []byte{}},
	}
}

func TestExtractWritesTreeAndMarker(t *testing.T) {
	dir := t.TempDir()
	if err := Extract(sampleFS(), "payload", dir, "v1", false); err != nil {
		t.Fatalf("extract: %v", err)
	}
	for _, p := range []string{
		"trail.exe",
		"config.textproto",
		filepath.Join("runtime", "app", "x.js"),
		filepath.Join("migrations", "U1.sql"),
	} {
		if _, err := os.Stat(filepath.Join(dir, p)); err != nil {
			t.Errorf("expected %s: %v", p, err)
		}
	}
	if _, err := os.Stat(filepath.Join(dir, ".gitkeep")); err == nil {
		t.Error(".gitkeep placeholder should not be extracted")
	}
	if b, err := os.ReadFile(filepath.Join(dir, markerName)); err != nil || string(b) != "v1\n" {
		t.Errorf("marker = %q, %v", b, err)
	}
}

func TestExtractSkipsWhenVersionMatches(t *testing.T) {
	dir := t.TempDir()
	if err := Extract(sampleFS(), "payload", dir, "v1", false); err != nil {
		t.Fatal(err)
	}
	// Clobber the file, then re-extract without force: the marker short-circuits.
	if err := os.WriteFile(filepath.Join(dir, "trail.exe"), []byte("CHANGED"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := Extract(sampleFS(), "payload", dir, "v1", false); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(filepath.Join(dir, "trail.exe")); string(b) != "CHANGED" {
		t.Errorf("expected skip, trail.exe = %q", b)
	}
	// A new version re-extracts.
	if err := Extract(sampleFS(), "payload", dir, "v2", false); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(filepath.Join(dir, "trail.exe")); string(b) != "TRAIL" {
		t.Errorf("expected re-extract, trail.exe = %q", b)
	}
	// Force re-extracts regardless of marker.
	if err := os.WriteFile(filepath.Join(dir, "trail.exe"), []byte("AGAIN"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := Extract(sampleFS(), "payload", dir, "v2", true); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(filepath.Join(dir, "trail.exe")); string(b) != "TRAIL" {
		t.Errorf("expected forced re-extract, trail.exe = %q", b)
	}
}

func TestSeedDepotCopiesConfigAndExcludesVaulterLite(t *testing.T) {
	app := t.TempDir()
	if err := os.WriteFile(filepath.Join(app, "config.textproto"), []byte("cfg"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(app, "runtime", "app"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(app, "runtime", "app", "x.js"), []byte("js"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(app, "runtime", "vaulter-lite"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(app, "runtime", "vaulter-lite", "keep"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	depot := filepath.Join(t.TempDir(), "traildepot")
	if err := SeedDepot(app, depot); err != nil {
		t.Fatalf("seed: %v", err)
	}
	if _, err := os.Stat(filepath.Join(depot, "config.textproto")); err != nil {
		t.Errorf("config not seeded: %v", err)
	}
	if _, err := os.Stat(filepath.Join(depot, "runtime", "app", "x.js")); err != nil {
		t.Errorf("runtime not seeded: %v", err)
	}
	if _, err := os.Stat(filepath.Join(depot, "runtime", "vaulter-lite")); err == nil {
		t.Error("vaulter-lite should be excluded from seeding")
	}

	// Second call is a no-op once config is present.
	if err := SeedDepot(app, depot); err != nil {
		t.Fatalf("second seed: %v", err)
	}
}
