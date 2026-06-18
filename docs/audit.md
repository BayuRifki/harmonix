# Harmonix Audit

Date: 2026-06-18

## Scope

This audit pass focused on validating whether the previously reported issues were actually fixed in the current codebase, then resolving the remaining gaps that still showed up in real command output.

Primary goals:

- verify coding fixes against current runtime/test reality
- verify UI/UX fixes against current component structure and behavior
- trace warning-level issues to root cause before changing code
- update this document so it reflects the current repo state instead of stale conclusions

## Commands Run

### Final verification results

- `npm run lint` -> pass
- `npm run typecheck` -> pass
- `npm run pretest` -> pass
- `npx vitest run` -> pass
  - `118` test files passed
  - `1083` tests passed

### Focused reproduction commands used during debugging

- `npx vitest run tests/unit/settingsTabs.test.tsx`
- `npx vitest run tests/unit/sourceView.test.tsx`
- `npm config get build-from-source`

## Executive Summary

### Reality check

Most of the previously reported product-level bugs are fixed in the current codebase.

Confirmed as fixed during this audit:

- `src/features/settings/SettingsTabs.tsx` correctly wires tab semantics with `id`, `aria-controls`, and `aria-labelledby`
- `src/App.tsx` includes catch-all routing and `RouteNotFound` fallback behavior
- `src/features/source/SourceView.tsx` defers the not-found state until source hydration completes
- `src/App.tsx` includes `id="main-content"` in the `/now-playing` branch, preserving skip-link parity
- earlier UI behavior improvements documented in this repo remain present

However, the repo was not fully "fixed based on reality" at the start of this pass because real command output still surfaced three active issues:

1. `tests/setup.ts` did not neutralize jsdom's throwing `window.scrollTo`
2. `tests/unit/sourceView.test.tsx` still produced React `act(...)` warning noise because mount-driven async effects were not being flushed deliberately in the test
3. `package.json` still used an npm rebuild flag that emitted a CLI warning on this environment

Those three items are now fixed in this audit pass.

## Root Cause Investigation

### 1. `window.scrollTo` warning in Settings tests

#### Symptom

Running:

- `npx vitest run tests/unit/settingsTabs.test.tsx`

produced this stderr stack trace before the tests passed:

- `Error: Not implemented: window.scrollTo`
- stack included `jsdom/browser/Window.js`
- stack included `motion-dom/.../KeyframesResolver.ts`

#### Evidence

- `tests/setup.ts` already stubbed `scrollIntoView`
- `tests/setup.ts` did not reliably override `window.scrollTo`
- jsdom exposes a `window.scrollTo` function that exists but throws `not implemented`
- the previous conditional stub only replaced `scrollTo` when it was missing, not when it was present-but-throwing

#### Root cause

Shared test setup assumed "missing API" instead of "present API that throws in jsdom".

Framer Motion's layout measurement path touched `window.scrollTo`, which made otherwise-passing tests emit noisy stderr.

#### Fix applied

- `tests/setup.ts`
  - now overrides `window.scrollTo` unconditionally with a no-op stub

#### Result

- rerunning `npx vitest run tests/unit/settingsTabs.test.tsx` no longer emits the `window.scrollTo` error

### 2. React `act(...)` warning in `SourceView` tests

#### Symptom

Running:

- `npx vitest run tests/unit/sourceView.test.tsx`

previously produced repeated warnings:

- `Warning: An update to SourceView inside a test was not wrapped in act(...)`

#### Evidence

- `src/features/source/SourceView.tsx` has mount-driven async effects:
  - source hydration refresh effect
  - playlists / liked tracks loading effect
- `tests/unit/sourceView.test.tsx` rendered the component and immediately asserted in some cases without any explicit effect flush point
- the warning reproduced even though assertions passed, which indicates test lifecycle mismatch rather than confirmed product failure

#### Root cause

The problem was in the test harness, not in `SourceView` production logic.

The tests were allowing async state updates triggered by `useEffect` to settle outside an awaited `act(...)` boundary.

#### Fix applied

- `tests/unit/sourceView.test.tsx`
  - kept synchronous render where immediate loading-state assertion is required
  - added a dedicated `flushEffects()` helper using awaited `act(...)`
  - updated tests that depend on post-effect state to await `flushEffects()` after render

#### Result

- rerunning `npx vitest run tests/unit/sourceView.test.tsx` passes cleanly without the prior `act(...)` warning noise

### 3. npm native rebuild warning

#### Symptom

Running the test path through npm previously surfaced:

- `npm warn Unknown cli config "--build-from-source"`

#### Evidence

- `package.json` had:
  - `"rebuild:native": "npm rebuild better-sqlite3 --build-from-source=false"`
- this warning reproduced via the `pretest` chain
- `npm config get build-from-source` returned `undefined` in this environment, reinforcing that the current CLI was not treating that flag as intended

#### Root cause

The script depended on a CLI flag shape that is not valid for the npm version in this environment.

The rebuild itself succeeded; the warning was script-level technical debt.

#### Fix applied

- `package.json`
  - changed `rebuild:native` from `npm rebuild better-sqlite3 --build-from-source=false`
  - to `npm rebuild better-sqlite3`

#### Result

- `npm run pretest` now completes cleanly without the previous warning

## Files Changed In This Audit Pass

### `tests/setup.ts`

- added unconditional `window.scrollTo` no-op stub
- purpose: eliminate false-negative stderr from jsdom + Framer Motion interaction

### `tests/unit/sourceView.test.tsx`

- introduced explicit post-render effect flushing via `flushEffects()`
- aligned immediate-loading assertion with synchronous first paint
- purpose: remove `act(...)` warnings without masking the real behavior being tested

### `package.json`

- simplified native rebuild command to `npm rebuild better-sqlite3`
- purpose: remove invalid npm CLI flag usage

## Current Findings

### Resolved in this pass

1. Test env `scrollTo` noise fixed
   - file: `tests/setup.ts`
   - status: resolved

2. `SourceView` test `act(...)` noise fixed
   - file: `tests/unit/sourceView.test.tsx`
   - status: resolved

3. npm native rebuild warning fixed
   - file: `package.json`
   - status: resolved

### Previously reported items confirmed as still fixed

1. Settings tab semantics remain correct
   - file: `src/features/settings/SettingsTabs.tsx`
   - status: remains fixed

2. App route fallback remains present
   - file: `src/App.tsx`
   - status: remains fixed

3. Source hydration / loading gate remains correct
   - file: `src/features/source/SourceView.tsx`
   - status: remains fixed

4. Skip-link parity for `/now-playing` remains present
   - file: `src/App.tsx`
   - status: remains fixed

## Remaining Technical Debt

These are not newly broken regressions from this audit pass, but they are still worth tracking.

### 1. Some tests intentionally emit stderr as part of their assertions

Examples from `npx vitest run` output:

- proxy recovery tests log expected failure states
- Spotify SDK / Widevine tests log expected error paths
- scanner tests log expected missing-directory errors

This is acceptable when the test is explicitly asserting degraded behavior, but it means "stderr completely clean" is no longer a reliable blanket statement for the whole suite.

Recommendation:

- distinguish between expected diagnostic stderr and unexpected warning noise in future audit notes

### 2. Visual UI/UX fixes are still only partially verified by automated tests

The codebase has good structural coverage for several UI fixes, but automated tests still do not fully prove real-window layout quality inside Electron.

Examples:

- Settings overflow improvement is verified structurally, not with real viewport measurement
- route/accessibility states are covered more than before, but not every visual interaction is proven end-to-end

Recommendation:

- add selective Playwright or screenshot-based checks for critical layouts if this becomes a release gate

### 3. Audit docs can drift behind the codebase quickly

This file had stale conclusions when this pass started:

- old test counts
- old statement claiming clean stderr without current evidence
- outdated "still open" items mixed with already-resolved items

Recommendation:

- treat `docs/audit.md` as a living verification log, not a one-time report

## UI/UX Notes

### Confirmed strengths in current code

- `src/features/settings/SettingsView.tsx` and `src/features/settings/SettingsTabs.tsx` now present a more controlled tabbed settings flow instead of a long stacked page
- `src/features/home/HomeView.tsx` provides stronger restart paths through greeting, resume, search, library, and recommendation CTAs
- `src/features/source/SourceView.tsx` presents source limitations with clearer explanatory banners and actions

### Remaining caution

No new high-confidence UI/UX bug was reproduced during this pass, but visual polish claims should still be treated carefully unless verified in a real Electron window.

## Historical Notes Kept For Context

The following earlier improvements remain relevant and still appear present in the codebase:

- similar tracks no longer dead-click in Now Playing
- queue actions exist via `TrackRowMenu`
- search/source rows use normalized `play now` behavior
- `/source/:id` deep-links into `/search?source=...`
- duplicate queue actions show toast feedback
- home recommendation area uses `ForYouSection`
- sidebar refresh behavior is guarded against redundant mount refreshes

## Final Status

At the end of this audit pass:

- previously reported major app-level fixes are confirmed present
- remaining warning-level issues reproduced from real commands are fixed
- verification commands are green
- this document now reflects current reality instead of the earlier stale state

## Verification Snapshot

- `npm run lint` -> pass
- `npm run typecheck` -> pass
- `npm run pretest` -> pass
- `npx vitest run` -> `118` files passed, `1081` tests passed

---

# Lyrics Audit Addendum

Date: 2026-06-18

## Scope

User-reported symptoms:

- lyrics panel says `No lyrics found` even when a track is playing
- when lyrics do appear, the active line does not stay in sync with the audio

## Phase 1: Root Cause Investigation

### Symptom A: `No lyrics found`

#### Evidence

- `src/lib/lyrics.ts` calls `GET https://lrclib.net/api/get?track_name=...&artist_name=...&album_name=...&duration=...`
- LRCLib's `/get` endpoint is strict: a duration mismatch, a punctuation difference, or a casing difference in the track or artist name returns a `404`
- `src/features/lyrics/LyricsPanel.tsx` surfaces every `404` / parse failure as the user-facing `No lyrics found` state

#### Root cause

- The product relied only on the strict `/get` endpoint and gave up as soon as the strict match failed
- There was no fallback to LRCLib's `/search` endpoint, which is fuzzy and would catch the same track under slight name / duration drift

### Symptom B: lyrics not in sync with playback

#### Evidence

- `src/lib/audio/engine.ts` only emits the `time` event from the HTMLMediaElement `timeupdate` DOM event
- Chromium fires `timeupdate` at most every ~250 ms
- `src/features/lyrics/LyricsPanel.tsx` re-evaluates the active line on every `positionMs` update

#### Root cause

- The store's `positionMs` is driven by `timeupdate` only
- A 250 ms cadence is too coarse for a song with ~4 lines / second — the active line is allowed to lag the audio by up to a quarter of a second before the next tick lands
- Worse, `timeupdate` does not always fire while audio is paused-and-resumed or during seek, so the active line can stick

## Phase 2-3: Pattern and Hypothesis

### Hypothesis A

- Adding a LRCLib `/search` fallback after `/get` fails will surface a usable result for tracks that do not match `/get` exactly
- Ranking the search results by `syncedLyrics` first, then `plainLyrics`, gives the best chance of synced lyrics

### Hypothesis B

- Reading `audio.currentTime` directly inside a `requestAnimationFrame` loop during playback provides a per-frame `positionMs`
- This loop should be started on `play()`, stopped on `pause()` / `ended()` / track change
- Falling back to `timeupdate` is unnecessary because rAF already produces strictly more events while playing; the existing `timeupdate` listener remains attached and serves as a backup if rAF is unavailable (e.g. in jsdom)

## Phase 4: Implementation

### Files changed

- `src/lib/lyrics.ts`
  - split the existing single-fetch flow into `fetchLyricsExact` + `fetchLyricsSearch`
  - `fetchLyrics` now tries `/get` first, then `/search`, then gives up
  - search results are ranked so a result with `syncedLyrics` is preferred over one with only `plainLyrics`
- `src/lib/audio/engine.ts`
  - added a rAF-based `time` ticker that runs while the audio element is playing
  - the ticker self-cancels on pause, `ended`, track change, or when `requestAnimationFrame` is unavailable
  - existing `timeupdate` listener is preserved as a fallback for environments without rAF (e.g. jsdom)
- `tests/unit/lyrics.test.ts`
  - new regression tests for the `/get` -> `/search` fallback path
  - covers the "search returns nothing" case to ensure we still surface `source: 'none'` rather than throwing

### Tests added

- `fetchLyrics fallback > falls back to /search when /get returns no result`
- `fetchLyrics fallback > returns none when both /get and /search have no usable result`

## Verification

- `npm run lint` -> pass
- `npm run typecheck` -> pass
- `npx vitest run tests/unit/lyrics.test.ts` -> `13` tests passed (was `11` before)
- `npx vitest run tests/unit/lyricsPanel.test.tsx` -> `3` tests passed
- `npx vitest run` -> `118` files passed, `1083` tests passed (was `1081`)

## Note about native rebuild

A native ABI mismatch surfaced during this audit pass:

- `better-sqlite3` had been previously built against `NODE_MODULE_VERSION 130`
- the Node version used to run the tests on this machine (`v24.13.0`) requires `NODE_MODULE_VERSION 137`
- 27 sqlite-backed tests failed with `NODE_MODULE_VERSION` errors before the fix

#### Fix

- ran `npm rebuild better-sqlite3` against the current Node
- all sqlite-backed tests now pass

This is an environment-level fix, not a code change. The codebase already has a `rebuild:native` script for exactly this scenario; the next person on a different Node version just needs to run `npm run rebuild:native` (which now invokes `npm rebuild better-sqlite3` without an invalid CLI flag).

## Files Touched In This Addendum

- `src/lib/lyrics.ts`
- `src/lib/audio/engine.ts`
- `tests/unit/lyrics.test.ts`
- `docs/audit.md` (this file)

---

# Lyrics UI Re-render Pressure Addendum

Date: 2026-06-18

## Scope

After landing the rAF ticker in `engine.ts` and the `/search` fallback in `lyrics.ts`, the lyrics panel still had a hidden regression risk: the component was directly subscribed to `usePlayerStore((s) => s.positionMs)`, which means the rAF ticker that fires 60+ times per second would force a full React re-render of the lyrics panel for every position update.

## Phase 1: Root Cause Investigation

### Evidence

- `src/features/lyrics/LyricsPanel.tsx` subscribed to `positionMs` via a Zustand selector before this pass
- the audio engine emits `positionMs` on every rAF tick while playing (a fix landed in the previous addendum)
- React + Zustand re-render the consumer component when a selected value changes
- a panel that re-renders 60+ times a second while playing is wasteful, and `findActiveLineIndex` would re-run over the full `lines` array every time

### Root cause

- direct `positionMs` subscription in a component that should only react to changes in the active line index, not to every position bump

## Phase 2-3: Pattern and Hypothesis

### Pattern

- sample the latest `positionMs` from the store via `useSyncExternalStore`-style reads inside a rAF effect, instead of subscribing via the selector
- only call `setState` when the sampled value actually changes (cheap `===` check)

### Hypothesis

- decoupling the panel from the `positionMs` selector removes the 60Hz re-render pressure while keeping the active-line indicator smooth
- the panel still re-derives the active line locally on every frame, so the visible behavior is identical to before

## Phase 4: Implementation

### Files changed

- `src/features/lyrics/LyricsPanel.tsx`
  - removed the `usePlayerStore((s) => s.positionMs)` selector subscription
  - added a `positionMs` local state initialized to `0`
  - added a rAF effect that reads `usePlayerStore.getState().positionMs` on every animation frame and updates local state only when the value actually changes
  - the rest of the panel (active-line calculation, line rendering) is unchanged
- `tests/unit/lyricsPanel.test.tsx`
  - new test `updates the active line as positionMs advances` that stubs `requestAnimationFrame` in jsdom and drives `positionMs` through the mock store
  - asserts that line `A` is active at 2s and line `C` is active at 6s, proving the rAF ticker reads the latest store position and the active-line calculation reacts to it

### Tests added

- `LyricsPanel > updates the active line as positionMs advances`

## Verification

- `npm run lint` -> pass
- `npm run typecheck` -> pass
- `npx vitest run tests/unit/lyricsPanel.test.tsx` -> 4/4 pass (was 3/3)
- `npx vitest run tests/unit/lyrics.test.ts` -> 13/13 pass
- `npx vitest run` -> 118 files, 1084 tests pass (was 1083)

## Files Touched In This Addendum

- `src/features/lyrics/LyricsPanel.tsx`
- `tests/unit/lyricsPanel.test.tsx`
- `docs/audit.md` (this file)
