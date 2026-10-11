---
title: "proxy.golang.org is unresolvable on this machine (use goproxy.io)"
type: issue
status: active
created: 2026-10-10
updated: 2026-10-10
tags: [environment, go, modules, network, proxy, tooling]
related_to: ["[[control-panel]]", "[[control-panel-gui-is-pure-go]]", "[[build-and-run]]"]
---

# proxy.golang.org is unresolvable on this machine (use goproxy.io)

**Verified 2026-10-10.** On this development machine the default Go module
proxy cannot be reached, so `go get` / `go mod tidy` / `go build` of a project
with uncached dependencies fails unless `GOPROXY` is changed.

## Evidence

- `Invoke-WebRequest https://proxy.golang.org -Method Head` → **DNS failure,
  "No such host"**; `Resolve-DnsName` likewise fails for that host.
- `https://github.com`, `https://goproxy.io` and `https://google.com` resolve and
  return **200**, so the network is up — only `proxy.golang.org` is blocked.
- With `GOPROXY=https://goproxy.io,direct` and `GOSUMDB=off`, `go get
  fyne.io/fyne/v2@v2.6.1`, `github.com/mattn/go-sqlite3`,
  `github.com/shirou/gopsutil/v4` and `github.com/go-gui-org/go-gui@v0.86.0` all
  downloaded successfully.

## Workaround

```sh
set GOPROXY=https://goproxy.io,direct
set GOSUMDB=off
```

`GOSUMDB=off` is included because the checksum database (`sum.golang.org`) is on
the same blocked host. This is an environment limitation, not a repository
defect; the module cache and `go.sum` are unaffected once populated.
