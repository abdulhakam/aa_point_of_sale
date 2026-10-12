// Package sfx makes the control panel a self-extracting launcher. When built
// with an embedded payload (see sfx.ps1) it carries the TrailBase server, its
// config, migrations, runtime, docs and guest components, and writes them next
// to the running executable on first launch — or again after an upgrade — so the
// single .exe needs no sibling files. Built without a payload (a plain
// `go build`), HasPayload reports false and the panel behaves exactly as before.
package sfx

import (
	"embed"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
)

//go:embed all:payload
var payloadFS embed.FS

const (
	payloadRoot = "payload"
	markerName  = ".aa-pos-payload"
)

// Version identifies the embedded payload. It is overridden at build time with
// `-ldflags "-X aa-pos/controlpanel/internal/sfx.Version=<build stamp>"` so a new
// build re-extracts over an older one.
var Version = "dev"

// HasPayload reports whether this binary embeds the application payload.
func HasPayload() bool {
	_, err := fs.Stat(payloadFS, path.Join(payloadRoot, "trail.exe"))
	return err == nil
}

// DefaultDir returns where the payload should be extracted: the executable's own
// directory when that is writable, otherwise a per-user folder under
// %LOCALAPPDATA% (so a read-only install location such as Program Files still
// works).
func DefaultDir() string {
	if exe, err := os.Executable(); err == nil {
		d := filepath.Dir(exe)
		if writable(d) {
			return d
		}
	}
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = os.TempDir()
	}
	return filepath.Join(base, "AA Point of Sale")
}

func writable(dir string) bool {
	f, err := os.CreateTemp(dir, ".aa-write-*")
	if err != nil {
		return false
	}
	name := f.Name()
	f.Close()
	os.Remove(name)
	return true
}

// Ensure extracts the embedded payload into dir unless it is already present at
// the current Version and a trail.exe is beside the marker (unless force is set).
func Ensure(dir string, force bool) error {
	return Extract(payloadFS, payloadRoot, dir, Version, force)
}

// Extract writes every file under root in src into dir, preserving the tree, and
// records version in the marker file. It is the testable core of Ensure.
func Extract(src fs.FS, root, dir, version string, force bool) error {
	marker := filepath.Join(dir, markerName)
	if !force {
		if b, err := os.ReadFile(marker); err == nil && strings.TrimSpace(string(b)) == version {
			if _, err := os.Stat(filepath.Join(dir, "trail.exe")); err == nil {
				return nil
			}
		}
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	err := fs.WalkDir(src, root, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(root, filepath.FromSlash(p))
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		if !d.IsDir() && filepath.Base(rel) == ".gitkeep" {
			return nil
		}
		target := filepath.Join(dir, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFileAtomic(src, p, target)
	})
	if err != nil {
		return err
	}
	return os.WriteFile(marker, []byte(version+"\n"), 0o644)
}

// copyFileAtomic writes via a temp file + rename so an interrupted extraction
// never leaves a half-written binary behind.
func copyFileAtomic(src fs.FS, name, target string) error {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	in, err := src.Open(name)
	if err != nil {
		return err
	}
	defer in.Close()
	tmp := target + ".tmp"
	out, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		os.Remove(tmp)
		return err
	}
	if err := out.Close(); err != nil {
		os.Remove(tmp)
		return err
	}
	return os.Rename(tmp, target)
}

// SeedDepot prepares a TrailBase depot from the extracted application payload the
// way dist\start.bat does: config.textproto, metadata.textproto, migrations\,
// runtime\ (keeping a generated vaulter-lite store) and wasm\. It is a no-op when
// the depot already holds a config.textproto, so it is safe on every launch.
func SeedDepot(appDir, depot string) error {
	if _, err := os.Stat(filepath.Join(depot, "config.textproto")); err == nil {
		return nil
	}
	if err := os.MkdirAll(depot, 0o755); err != nil {
		return err
	}
	for _, name := range []string{"config.textproto", "metadata.textproto"} {
		src := filepath.Join(appDir, name)
		if _, err := os.Stat(src); err != nil {
			continue
		}
		if err := copyFile(src, filepath.Join(depot, name)); err != nil {
			return err
		}
	}
	for _, d := range []string{"migrations", "runtime", "wasm"} {
		src := filepath.Join(appDir, d)
		if _, err := os.Stat(src); err != nil {
			continue
		}
		var exclude map[string]bool
		if d == "runtime" {
			exclude = map[string]bool{"vaulter-lite": true}
		}
		if err := copyTree(src, filepath.Join(depot, d), exclude); err != nil {
			return err
		}
	}
	return nil
}

// copyTree recursively copies src into dst, skipping excluded top-level names.
func copyTree(src, dst string, exclude map[string]bool) error {
	return filepath.WalkDir(src, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, p)
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
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFile(p, target)
	})
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
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}
