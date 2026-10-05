---
title: The keyboard layer, and the two bugs only a real keystroke could find
type: note
status: active
created: 2026-10-04
updated: 2026-10-04
tags: [guest, keyboard, hotkeys, accessibility, client-js, verification, cdp]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-minimal-file-authoring-contract]]", "[[runtime-js-guest-platform]]", "[[guest-ui-is-a-direct-shift-of-legacy]]", "[[tb-0023-direct-shift-legacy-ui-to-guest]]", "[[tb-0024-flatten-new-system-layout]]", "[[settle-structural-claims-with-the-owning-artifact]]", "[[smoke-count-is-not-a-hard-coded-number]]", "[[route-snapshot-was-snapshotting-redirects]]", "[[tb-0032-manifest-first-refactor]]", "[[client-side-live-recalculation]]", "[[mobile-layout-is-additive-to-the-legacy-look]]", "[[screen-parity-against-the-legacy-bundle-2026-10-04]]"]
---

# The keyboard layer, and the two bugs only a real keystroke could find

The app is now keyboard-first. One file, `app/public/js/hotkeys.js`, framework-free, loaded by
`views/layout.html` next to `app.js` and entirely separate from it — it is an accelerator for markup
that already works, so it can be reasoned about, tested and dropped without touching the app's own
enhancements.

**The interesting part is not the feature. It is that two defects in it were invisible to reading and to
every existing gate, and one keystroke found each of them in under a minute.**

## What it does

One keydown listener, one declarative table, no per-page registration — a new page gets the whole set
for free because the table is page-agnostic and the page-specific rows are read from the DOM.

| group | keys | what |
|---|---|---|
| Go to | `Ctrl+K` or `:` | command palette over every link on the page |
| | `?` | the help overlay for *this* page |
| | `Esc` | close an overlay, else clear the row, else clear the filter |
| Find | `/` | focus the filter or search box |
| | `f` | focus the first field |
| | `Ctrl+F`, `Ctrl+L` | same as `/`, without stealing the browser's own |
| Move | `j` `k` | next / previous row, with a visible focus ring |
| | `g g` / `G`, `Home` / `End` | first / last row |
| | `PageDown` / `PageUp` | ten rows |
| | `Enter` / `e` | open / edit the focused row |
| Form | `Ctrl+Enter` | submit the form, via `requestSubmit` so validation and `data-confirm` still run |
| | `Alt+↑` / `Alt+↓` | previous / next field |
| | `Alt+1`…`Alt+9` | the page's action buttons, labelled with the button's own name |
| Jump | `g d` `g i` `g n` `g p` `g m` `g v` `g r` `g c` `g q` `g a` `g o` | dashboard, invoices, new invoice, payments, new payment, inventory, reports, cash memo, print queue, management, pages |
| Act | `p` | print, using the page's own print button |
| | `r` | the background-refresh button |
| | `R` | reload the page |

Discoverability is treated as part of the feature, not as polish:

- **`?` builds its own list from the page**, so it cannot describe a shortcut that is not there. Rail
  destinations are labelled from the rail's own `title` attributes and keyed by href, so a nav link
  added later appears on its own and appears **once**.
- **The palette is built from the page's own links**, not from a route table — so it works on every
  screen, including ones nobody wrote a line for.
- **A `role="status" aria-live` region narrates the cursor**, because a focus ring nobody can see is not
  an accessible cursor.
- **One unobtrusive nudge**, once per session, bottom centre.

## The three rules it will not break

1. **A bare letter never fires while a text field, textarea, select or contenteditable has focus.**
   Accounting software is full of one-letter fields, and a hotkey that swallows a typed `e` is worse
   than no hotkey. Only `Esc`, `Ctrl+Enter` and `Alt+↑/↓` work while typing — those have no meaning in a
   field anyway.
2. **A binding fires only when the modifiers it declares are exactly the ones held**, so `Ctrl+Enter`
   submits, plain `Enter` still inserts a newline, `Ctrl+R` still reloads and `Cmd+Tab` still switches
   applications.
3. **Nothing destructive is bound to a keypress that skips its form.** A hotkey submits a form; it
   cannot invent a delete. `Ctrl+Enter` uses `requestSubmit`, so `data-confirm` still confirms and
   required fields still block.

## Bug 1: every Ctrl, Alt and Shift binding was silently dead

`modifierMatches` tested **the binding object** instead of its `keys` string:

```js
var wants = { ctrl: /ctrl/.test(binding), alt: /alt/.test(binding) };   // "[object Object]" — never matches
```

So `wantsCtrl` and `wantsAlt` were always `false` and the Shift check always rejected a shifted key. The
symptom was the worst kind: **`?`, `G` and `Ctrl+K` did nothing, and `j`/`k` worked perfectly.** Ten of
the harness's assertions failed, all of them the modified keys.

A one-character fix (`binding.keys`, plus `binding.shift === true` for `?` and `G`) and all thirty-one
passed.

**This is why the layer was driven rather than read.** Nothing static would have found it: the code is
correct-looking, the table is right, and the failure is uniform across exactly the keys that carry a
modifier. `guest-smoke.mjs` cannot see it — it never presses a key.

## Bug 2: `Escape` matched nothing on any page

`normalise` emitted `event.key` verbatim, and the DOM reports `Escape`, `Enter`, `ArrowDown`, `Home`,
`End` while the table spells them lowercase. `escape` never matched `Escape`, so the overlays could not
be closed and the row cursor could not be cleared — on every page, silently.

Fixed by lowercasing named keys and leaving single characters alone (so `G` stays `G` and `?` stays `?`).

A related trap is recorded in the code: **a binding spelled `keys: "shift+?"` can never match anything**,
because a single-character key never normalises to a `shift+`-prefixed string — Chrome reports shift+/
as `key: "?"`. The shift requirement has to live on the binding as a flag. The reload binding was written
that way first and was unreachable.

## The check that found both

`trailbase/tools/hotkey-check.mjs` — headless Chrome over the DevTools Protocol, using the `WebSocket`
built into node 24, so it adds no dependency. It logs in through the real form, drives the app with real
`Input.dispatchKeyEvent` calls, and asserts on the DOM after each one.

```text
== 34 passed, 0 failed ==
```

It asserts the three rules directly, including the negative ones:

- **`defaultPrevented`, not the field's text.** A CDP keystroke's text insertion depends on how Chrome
  routes the event, so asserting on the value can fail for reasons that have nothing to do with the
  hotkeys. A listener registered *after* the layer's, on the same node, sees the final state — and
  `defaultPrevented === false` is the actual claim.
- **`?` is not default-prevented while typing**, and no row moved.
- **No shortcut is listed twice** — this caught the rail destinations appearing twice, once bare and once
  with their titles, because the binding loop added a jump binding and then the chord map added it again.
- **`alt+1` reaches the page's first action button**, and nothing was submitted.

Three harness bugs were found and fixed on the way, each worth recording because each produced a
**confident wrong answer**:

| harness bug | what it made the check claim |
|---|---|
| `Page.navigate` returns before the new document exists, and the context it leaves behind is the old page — whose `readyState` is already `complete` | the login form was filled on a document that had not arrived, so it "logged out" on a login that worked |
| waiting on `readyState === "interactive"` | `interactive` is set **before deferred scripts run**, so keystrokes landed on a page with no listener attached. Fixed by a `data-hk-ready` marker set by `init()`, which is also useful in its own right |
| "click the first submit button on this page" | an authenticated visitor is redirected off `/login` to the dashboard, whose first form posts to `/reports/refresh` — so the click refreshed the background job instead of signing in, and reported a login failure with no error anywhere |

## One harness mistake worth naming

`alt+1` on the parties page **is** "Create". Testing it by observing its effect would have submitted the
create form and written a row to a database that had been reconciled against production twenty minutes
earlier — the mistake this vault has already recorded twice
([[route-snapshot-was-snapshotting-redirects]]). The check now sits last, and its observation listener
calls `preventDefault`. The click is seen; nothing happens.

Post-run `db-digest.mjs`: `60245 → 60246`, only the seeded `Difference` party, every money column equal.
**No contamination.**

## Deliberate omissions, with reasons

- **No chord timeout longer than 1500 ms**, and a lone `g` shows as `key prefix: g` in the live region
  rather than doing nothing silently.
- **The tab order is unchanged.** The focused row gets `tabindex="-1"`, so it is focusable
  programmatically and stays out of the tab order. A shortcut that rewrote the tab order would break the
  one thing a keyboard user already knows.
- **`Ctrl+S` is not bound.** The browser's save dialog is not the app's to take.
- **The focus ring is an `outline`, not a `box-shadow`**, and is removed in `@media print` — an operator
  pressing `p` must not get a blue bar down the side of the printout.
- **No `Alt+ArrowRight`.** The first version bound it to "next field, and nothing else", which is a
  comment pretending to be a feature.

## Gates re-run after the change

| gate | result |
|---|---|
| `tools/hotkey-check.mjs` | **34 passed, 0 failed** |
| `tools/guest-smoke.mjs` | **passed in full** |
| `tools/route-snapshot.mjs` | **49 routes, 0 erroring** |
| `tools/db-digest.mjs` | 60,245 → 60,246, only the seeded `Difference` party |
| `tools/report-sql-provenance.mjs` | unchanged: 10 byte-identical, 3 transport-only, largest difference 2.3e-10 |

The count is whatever the tool prints, not a number written down here — see
[[smoke-count-is-not-a-hard-coded-number]].

## Constraints on this work

- **One added client file, and it adds behaviour rather than replacing form methods with `fetch`.** Every
  binding accelerates something the markup already does; the palette navigates to links that already
  exist, and `Ctrl+Enter` submits the form rather than posting it. That is the shape the rest of the
  guest follows — [[runtime-js-minimal-file-authoring-contract]],
  [[runtime-js-guest-platform]] — and it is why the layer is a separate file rather than a rewrite of
  `app.js`.
- [[guest-ui-is-a-direct-shift-of-legacy]] — a keyboard-first guest and a mouse-first legacy app are
  two systems to learn, so the shortcuts are accelerators, never the only way to anything. The help
  overlay says so, and the rail is unchanged.
- [[mobile-layout-is-additive-to-the-legacy-look]] — the nudge moves above the bottom bar under 768px,
  and the help's key column collapses to one line there.

## What is not done

- **No `accesskey` attributes on the server-rendered controls.** The layer is pure client JS, so the
  shortcuts work with JavaScript and vanish without it. Putting `accesskey` on the markup would make them
  work without JS too, and is the obvious next step — it is markup work across every view.
- **The mobile layout gets the layer but no thumb-reachable equivalents**, and `Alt+1`…`Alt+9` are not
  reachable on a phone keyboard at all.
- **No keybinding discovery beyond `?`.** There is no `?` → "press a key to find what it does", which is
  the only way to make a scheme like this learnable by someone who was not told about it.

## Related

- [[tb-0023-direct-shift-legacy-ui-to-guest]] — the remaining parity work; this does not reduce it.
- [[screen-parity-against-the-legacy-bundle-2026-10-04]] — what the keyboard can reach, screen by screen.