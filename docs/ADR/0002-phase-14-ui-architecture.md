# ADR-0002: Phase 14 UI Architecture

**Status**: Accepted
**Date**: 2026-06-09
**Deciders**: Project founder

---

## Context

Phase 14 (the UI/UX overhaul) introduced a number of architectural decisions that are
not obvious from reading the code in isolation. This ADR records the _why_ so future
maintainers (and future-us) can change these systems without rediscovering the
trade-offs. The decisions are listed in roughly the order they became relevant.

The decisions covered here are:

1. Adaptive color extraction approach (and the Web Worker refactor)
2. Adaptive palette interpolation in HSL color space
3. Glassmorphism token design
4. Side-panel primitive (`SidePanel`)
5. Insights-store separation from the persisted UI store
6. Generic store factories for testability

The other big Phase 14 choices (chart library — removed in 14.6 cleanup; dnd-kit over
react-dnd; fuse.js for command palette) are noted briefly in §7 but are documented
in commit messages rather than dedicated sections.

---

## 1. Adaptive color extraction

### Decision

We extract the dominant accent color from the current track's artwork **on a Web
Worker**, using `ImageData.data.buffer` transfer (zero-copy) for the pixel payload.
The main thread is responsible for the _Image_ load + canvas draw; the worker is
responsible for the _per-pixel_ math.

### Why a worker, and why this split

The previous implementation ran the full pipeline (image load, draw, cluster) on the
main thread. The `clusterPixels` loop takes 5-20 ms on a typical artwork, which is
exactly the window where we are animating the new accent in (cubic ease over
600 ms). The cost manifested as a visible stall on the first frame of the
interpolation, especially on lower-end hardware.

We considered three alternatives:

- **A. OffscreenCanvas on the worker.** Everything off the main thread, including
  drawImage. Requires `img.transferControlToOffscreen()`, which works in Chromium
  but historically had edge cases (memory accounting, type-stripped refs). Worth
  trying later if main-thread draw becomes the bottleneck — it isn't today.
- **B. Pure main thread with a `requestIdleCallback` fallback.** No threading,
  just defer when the main thread is free. The Idle callback fires too late: by
  the time the user has skipped two tracks, the new accent is still interpolating
  from the old one's palette. Felt janky.
- **C. Web Worker for the math only, main thread for the image plumbing.**
  Image decode and `drawImage` are fast (< 1 ms on a 50x50 downsample) and
  _must_ run on the main thread because they touch DOM/Canvas. The 50x50
  ImageData buffer is transferred to the worker (zero-copy via the transfer
  list), the worker runs `clusterPixels`, posts back the 3-number HSL color.
  The heavy work moves off; the DOM work stays.

**We chose C.** The implementation is in `src/lib/workers/colorWorker.ts` (worker
entry, 13 lines) + `src/lib/workers/colorWorkerCore.ts` (pure logic, 34 lines) +
refactored `src/lib/colorExtractor.ts`. Vite's `?worker` import emits
`colorWorker-{hash}.js` as a separate chunk (2.87 kB uncompressed) that is lazy-loaded
on the first artwork change.

### Why an LRU cache, not an unbounded one

The previous implementation held an `Image` per URL in a module-level Map that was
**never trimmed on the success path** — the 5-second `setTimeout(cleanup)` only
fired on the error path. Each track change accumulated a decoded bitmap (~1-2 MB
per image) and the Map grew without bound. This was a real memory leak in
practice: a 4-hour session of music was leaking ~2 GB before GC could catch up.

The new implementation:

- The `Image` is local to each `extractDominantColor` call and is GC'd as soon as
  the function returns (no global reference).
- The extracted HSL color is small (3 numbers, ~24 bytes) and stored in a
  **bounded 128-entry LRU** cache. Capping at 128 entries means the worst case
  is ~4 KB of color data in memory regardless of how many tracks the user plays.
  Re-extraction for a recently-cached track is cheap (1 Image load + draw +
  worker round-trip) so a low cap is fine.

### Why a per-call timeout

The worker can die in subtle ways: OOM on a huge image, exception in
`clusterPixels`, a transport glitch. Without a timeout, a single dead call would
hang the consumer (`useAdaptiveAccent`) forever — the user would see the old
accent, no error, no recovery. We add a 3-second timeout that rejects the
promise; the consumer catches the rejection and falls back to the theme palette.

---

## 2. Adaptive palette interpolation in HSL

### Decision

We interpolate accent palettes **in HSL color space**, with a hue-wrap so that
`hsl(350, …)` → `hsl(10, …)` does not pass through the wrong half of the color
wheel. The palette defines three roles: `accent` (the main hue), `vibrant` (more
saturated, slightly lighter), `muted` (less saturated, much darker). The
interpolation eases over 600 ms with a cubic ease.

### Why HSL, not RGB

In RGB, linear interpolation between `hsl(350, …)` and `hsl(10, …)` produces
**muddy gray** for the middle of the transition (the human eye sees it as the
colors desaturating, but the math is just averaging red+green channels across
the wheel). In HSL, with hue wrap, the interpolation can take the _short arc_
around the color wheel and the user perceives a clean hue rotation.

The cost of HSL interpolation is one `rgbToHsl` + one `hslToRgb` per
palette-eval (or none, if we keep the intermediate in HSL and only convert at
CSS-apply time, which is what we do — see `interpolatePalette` /
`paletteToCssVars`).

### Why an explicit `muted` + `vibrant` palette

CSS custom properties let us have one source of truth (the 3 HSL colors) and let
components opt into the role they need. A button hover state uses `--accent-hover`,
a glowing badge uses `--accent-vibrant`, a dim background uses `--accent-muted`.
Without the explicit roles, every component would have to derive its own shade
from `--accent`, and the math would be inconsistent across the app.

---

## 3. Glassmorphism token design

### Decision

Glass surfaces are a single CSS class (`.glass` / `.glass-strong` / `.glass-subtle`)
plus a `data-glass` attribute that consumes the three tokens
(`--glass-bg`, `--glass-border`, `--glass-blur`) defined in `src/styles.css`.
A user setting "Glass intensity: Off" zeroes out the tokens so all `.glass-*`
classes degrade to plain backgrounds.

### Why a single class, not a per-component design

We considered a `<Glass>` component (with `intensity` + `as` props). The
component approach is more "React-y" but it forces every glass surface to import
it. The class approach lets us mix glass with arbitrary layout (e.g., a
`<button>` with `.glass` overlay) without re-exporting a wrapper for every
HTML element. It also degrades gracefully when JS is disabled (a real concern
for Electron, which serves a static first frame).

The cost is a small bit of magic: developers have to know that `.glass` exists.
The trade-off is worth it because the glass aesthetic is _visible_ — it's
hard to accidentally break, and a class name is easier to grep than a component.

---

## 4. Side-panel primitive

### Decision

A new `SidePanel` component (`src/components/ui/SidePanel.tsx`) lives alongside the
existing centered `Modal`. It has its own slide-in animation, focus trap, scroll
lock, ESC handler, and backdrop. The first consumer is `TrackInsightsPanel`, but
it is generic enough for any right-anchored panel.

### Why a new primitive, not a `Modal` variant

The `Modal` is centered with a `max-w-*` constraint. Trying to make it a
"right-side variant" would require either:

- A `position` prop that swaps in/out an entirely different layout (the
  abstraction leaks)
- Two parallel implementations (a refactor, not a new feature)

The right-slide-in pattern is sufficiently distinct (different focus-trap
direction, different animation curve, different width semantics) that a
dedicated primitive is clearer. We expect 1-2 more consumers in the next few
phases (e.g., a "lyrics detail" overlay), which justifies the standalone
component.

---

## 5. Insights-store separation

### Decision

The track insights panel reads from a dedicated `useInsightsStore`
(`{track: Track | null, open(track), close()}`) — **not** from `useUiStore`.

### Why a separate store

`useUiStore` is persisted to `localStorage` (sidebar state, recents, theme
preferences, etc.). Persisting a `Track` object is wrong on multiple levels:

- The `Track` shape includes non-serializable / non-portable fields
  (`artworkUrl` with auth tokens, `externalUrl`, etc.)
- The `Track` shape changes between schema versions; the persisted UI state
  would have to be migrated
- A stale `Track` in `useUiStore` would be confusing to read on next launch
  ("why is the insights panel showing a track I haven't played?")

By keeping the insights state ephemeral and separate, the persisted-UI
invariant stays simple ("only persist user preferences, never application
data"). The insights store is small enough (3 lines of state) that the
duplication is not a cost.

---

## 6. Generic store factories for testability

### Decision

Stores that create non-serializable resources (Web Workers, AudioContext-derived
nodes, long-lived subscriptions) expose a `__setXForTests` hook so unit tests can
inject a fake. Production code never calls these.

The pattern shows up in:

- `useInsightsStore.open(track)` — no factory needed; just data
- `colorExtractor` — `__setColorWorkerFactoryForTests(factory)` injects a fake
  `Worker`-like that resolves on microtask, so we can test the round-trip
  end-to-end in jsdom (which has no real Worker support)

### Why not `vi.mock` on the worker module

We considered `vi.mock('../../src/lib/workers/colorWorker?worker', ...)`. The
problem is the `?worker` query in the import path — Vite-specific, and vitest's
mock resolution is brittle around it. The factory-injection pattern is more
explicit, type-safe (the factory signature is checked at the call site), and
doesn't depend on test-runner quirks.

The cost is a tiny bit of production code that exists only for tests
(`__setColorWorkerFactoryForTests`, `__clearColorCacheForTests`,
`__getColorCacheSizeForTests`). These are tree-shaken in production builds
because they're never called.

---

## 7. Other Phase 14 choices (not detailed here)

- **fuse.js for the command palette** (vs MiniSearch / FlexSearch): smallest
  bundle, zero-config fuzzy search, and the indexing cost is fine for the
  ~thousands of items we search. Bundle cost: ~6 KB gzipped.
- **@dnd-kit over react-dnd**: modern, accessible (built-in screen reader
  announcements), smaller bundle, actively maintained. Bundle cost: ~10 KB
  gzipped.
- **Chart library**: not needed. Analytics feature was removed in the 14.6
  cleanup pass (recharts was the previous choice); no chart library is
  currently a dependency.
- **No chart library needed** for the EQ visualizer: we use a custom canvas
  drawing routine (`<EqResponseCurve>`), which is also offloaded to a 30-FPS
  RAF loop and respects `prefers-reduced-motion`.

---

## Consequences

These decisions are now baked into:

- `src/lib/workers/colorWorker.ts`, `src/lib/workers/colorWorkerCore.ts`,
  `src/lib/colorExtractor.ts` — color extraction pipeline
- `src/hooks/useAdaptiveAccent.ts` — main consumer (HSL interp + theme
  observer + cleanup)
- `src/components/ui/SidePanel.tsx` — slide-in primitive
- `src/features/trackInsights/` — insights panel + host + store wiring
- `src/stores/insightsStore.ts` — the dedicated ephemeral store
- `src/styles.css` — glass tokens + `data-glass` attribute

When changing any of these:

1. Run the focused test suite (`npm run test -- tests/unit/{colorWorker,colorWorkerIntegration,eqResponse,sidePanel,trackInsights}`) to make sure the
   pre-commit invariants still hold.
2. If the change affects the worker protocol, also update
   `tests/unit/colorWorkerCore.test.ts` (the pure-logic tests) — those are
   the contract tests.
3. If the change adds a new role to the palette (e.g., a "warning" color
   derived from artwork), update `paletteToCssVars` _and_ the styles that
   consume the new token.

---

## Alternatives revisited (would we change this?)

- **Worker instead of OffscreenCanvas**: revisit only if main-thread draw
  becomes a measurable bottleneck. The 50x50 downsample draw is currently
  sub-millisecond.
- **HSL vs OKLCH**: OKLCH has better perceptual uniformity (hue rotations
  look more consistent in lightness), but adds a dependency or ~50 lines of
  math. HSL is fine for the "vibrant + muted + accent" palette we use today.
  Worth revisiting if the palette grows to 5+ roles.
- **SidePanel vs. extending Modal**: the dedicated component is correct.
  If a third primitive (e.g., a bottom sheet) appears, the `useDialogShell`
  composition pattern would let us share the focus-trap, scroll-lock, and
  ESC logic. Defer until needed.
