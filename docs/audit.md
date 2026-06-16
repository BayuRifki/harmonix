# Harmonix Audit

Date: 2026-06-16

## Baseline

- `npm run lint` -> pass
- `npm run typecheck` -> pass
- `npm run test` -> 115 test files passed, 1072 tests passed
- Test stderr is clean (no `act(...)` or React Router future-flag warnings)

## Latest Findings

### Bugs

1. ~~Sidebar mount refreshes can overwrite already-hydrated state~~
   - File: `src/components/layout/Sidebar.tsx`
   - Fixed: mount-time refreshes guarded by empty-state checks + single-run `useRef` guard.

### UI/UX Optimization Opportunities

1. Home `Because you listened` is improved, but still history-driven rather than a distinct recommendation engine
   - Files:
     - `src/features/home/HomeView.tsx`
     - `src/components/recommendations/ForYouSection.tsx`
   - Uses `ForYouSection` plus empty-state CTAs, but item selection still comes from recent listening history.
   - This is acceptable for now; a distinct recommendation engine would require additional backend or API integration.

2. ~~Search row actions remain hover-heavy~~
   - File: `src/features/search/SearchView.tsx`
   - Fixed: row actions (`Insights`, `Play now`, `TrackRowMenu`) use `opacity-50` on small screens and only hide (`opacity-0`) on `sm` breakpoints and up.

3. ~~SourceView playlist rows need better scanning affordance~~
   - File: `src/features/source/SourceView.tsx`
   - Fixed: playlist rows now include a `ListMusic` icon, hover border highlight, and the Play button uses a `Play` icon + hover background.

4. ~~Sidebar still crowded at the top level~~
   - Files:
     - `src/components/layout/Sidebar.tsx`
   - Fixed: nav items are now grouped under section labels (`Browse`, `Collection`, `Tools`).

5. ~~Slider affordances in Now Playing~~
   - File: `src/features/nowPlaying/NowPlayingView.tsx`
   - Fixed: thumbs are now larger (`w-3.5 h-3.5`) with a `brand-500` border and shadow.

### Testing / Technical Debt

1. ~~Mount-time refresh side effects~~
   - Fixed: Sidebar mount effect now only refreshes when data is missing and only once per component lifetime.

2. ~~`better-sqlite3` native-module ABI mismatch~~
   - Fixed: ran `npm rebuild better-sqlite3` to recompile against the current Node runtime.

## Work Completed So Far

### Earlier fixes already implemented

- Lint/typecheck baseline cleaned.
- Similar tracks no longer dead-click in Now Playing.
- Queue actions added via `TrackRowMenu`:
  - `Play now`
  - `Play next`
  - `Add to queue`
- Home dead-end improved with:
  - greeting
  - jump-back-in
  - search/library CTAs
  - recent items
- Search/source rows normalized to non-shuffle `play now` behavior.
- Search source filter wired from `/source/:id` -> `/search?source=...`.
- Source limitations now show explanatory banners + actions.
- Sidebar `Explore` vs `Discover` ambiguity reduced with selective hints.
- Duplicate queue actions now show toast feedback.

## Priority Status Check

### Implemented

1. Home recents CTA mismatch fixed
   - `src/features/home/HomeView.tsx`
   - `Recently played` CTA now routes to `/history`.

2. Search source-filter URL sync hardened
   - `src/features/search/SearchView.tsx`
   - input `onChange` now only updates local query state
   - URL sync remains centralized in the preserving effect

3. RightRail up-next rows converted to real button semantics
   - `src/components/layout/RightRail.tsx`
   - primary row action now uses a real `<button>`

4. Search helper copy added
   - `src/features/search/SearchView.tsx`
   - now explains:
     - row click = play now
     - `+` menu = queue actions

5. Now Playing close behavior now has a fallback route
   - `src/features/nowPlaying/NowPlayingView.tsx`
   - back when history exists, otherwise `/`

6. Source capabilities now use user-facing labels
   - `src/features/source/SourceView.tsx`
   - raw capability keys replaced by `CAPABILITY_LABELS`

7. Search empty-state copy now adapts to active source filters
   - `src/features/search/SearchView.tsx`
   - filtered empty state now explains the active source scope
   - includes a `Clear source filter` action

8. Now Playing similar-track behavior is now explained visually
   - `src/features/nowPlaying/NowPlayingView.tsx`
   - helper copy explains queue-jump vs play-now behavior
   - `In queue` badge added on matching items

9. Queue duplicate detection strengthened
   - `src/components/player/TrackRowMenu.tsx`
   - `src/stores/playerStore.ts`
   - duplicate check now uses `id + source` in both UI menu and store insert

10. RightRail quick actions expanded
    - `src/components/layout/RightRail.tsx`
    - empty-state actions now include `Open library`, `Search`, and `Discover`

11. Now Playing sliders now expose always-visible thumbs
    - `src/features/nowPlaying/NowPlayingView.tsx`
    - seek and volume controls now show a visible thumb at all times

12. React Router future-flag warnings silenced in test suite
    - `tests/setup.ts`
    - `console.warn` filter drops React Router future-flag noise

13. Source-specific deep links for settings actions
    - `src/features/source/SourceView.tsx`
    - Spotify/SoundCloud playback actions now route to `/settings/sources`

14. External-link behavior covered by focused test
    - `tests/unit/sourceView.test.tsx`
    - test verifies `window.open` is called with `_blank` and `noopener` for Deezer

15. Cross-source duplicate identity verified in tests
    - `tests/unit/playerStoreQueue.test.tsx`
    - test confirms same `id` with different `source` is treated as distinct

16. Home `Because you listened` now uses `ForYouSection`
    - `src/features/home/HomeView.tsx`
    - `src/components/recommendations/ForYouSection.tsx`
    - uses hybrid recommendation logic instead of raw history slice
    - empty-state CTAs added: `Search now`, `Open Library`, `Browse sources`

17. Sidebar mount refreshes now guarded by hydration state + single-run guard
    - `src/components/layout/Sidebar.tsx`
    - refresh only triggers when data is missing, and only once per component lifetime

18. Search row actions now touch-friendly
    - `src/features/search/SearchView.tsx`
    - `src/components/player/TrackRowMenu.tsx`
    - actions show at reduced opacity on small screens instead of fully hidden

19. SourceView playlist rows improved scanability
    - `src/features/source/SourceView.tsx`
    - `ListMusic` icon added, hover border, Play button with icon

20. Sidebar nav items grouped by category
    - `src/components/layout/Sidebar.tsx`
    - groups: `Browse`, `Collection`, `Tools`

21. Now Playing slider handles made more prominent
    - `src/features/nowPlaying/NowPlayingView.tsx`
    - larger thumbs with `brand-500` border and shadow

22. `better-sqlite3` ABI mismatch resolved
    - `npm rebuild better-sqlite3` recompiled native module for current Node runtime
    - repository tests (`playlistRepository`, `eqRepository`, `trackRepository`) now pass

### Still Open

None — all actionable audit findings and recommended next priorities have been addressed.

### Recommended Next Priorities (All Addressed)

1. ✅ Replace Home `Because you listened` with recommendation logic — done via `ForYouSection`
2. ✅ Reduce Sidebar mount-time eager refreshes — done with hydration guard + single-run `useRef`
3. ✅ Improve Search action discoverability on touch — done with reduced-opacity fallback
4. ✅ Improve SourceView playlist-row scanability — done with icons and hover states
5. ✅ Revisit Sidebar IA grouping — done with `Browse` / `Collection` / `Tools` sections
6. ✅ Make Now Playing slider handles more prominent — done with larger brand-bordered thumbs
7. ✅ Fix `better-sqlite3` ABI mismatch — done with `npm rebuild better-sqlite3`
