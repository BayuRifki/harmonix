# Harmonix Audit

Date: 2026-06-17

## Baseline

- `npm run lint` -> pass
- `npm run typecheck` -> pass
- `npm run test` -> 115 test files passed, 1072 tests passed
- Test stderr is clean (no `act(...)` or React Router future-flag warnings)

## Latest Findings

### Bugs

1. Reality check: previously reported high-priority bugs are now fixed in the current codebase
   - Verified fixes:
     - `src/features/settings/SettingsTabs.tsx` now has proper `id` / `aria-controls` / `aria-labelledby` wiring for tabs and tabpanels.
     - `src/App.tsx` now includes `path="*"` catch-all routes plus `RouteNotFound` recovery UI.
     - `src/features/source/SourceView.tsx` now defers the `not found` state behind `hasFetched` and shows a loading state first.
     - `README.md` now documents `better-sqlite3` and native rebuild expectations correctly.
   - Conclusion:
     - These items should remain in audit history as resolved work, not as active findings.

### UI/UX Optimization Opportunities

1. Reality check: previously reported UI/UX issues are now fixed in the current codebase
   - Verified fixes:
     - `src/App.tsx` now renders `id="main-content"` in the `/now-playing` branch, so the skip link works there too.
     - `src/components/layout/Sidebar.tsx` now uses real sibling buttons for disclosure and actions instead of nested interactive wrappers.
     - `src/features/playlist/PlaylistDetailView.tsx` now separates the primary play action from secondary row actions.
     - `src/components/layout/PlayerBar.tsx` now supports focus-driven expansion in addition to hover and pinning.
   - Conclusion:
     - These should also be treated as resolved items, not active optimization gaps.

### Testing / Technical Debt

1. Current checks are healthy, but the test command should be re-verified after the next fixes land
   - Current local verification from this audit pass:
     - `npm run lint` -> pass
     - `npm run typecheck` -> pass
     - `npm run build` -> pass
   - Note:
     - `npm run test` previously passed per baseline, but was not re-captured cleanly during this pass because the shell output surfaced native rebuild warning noise before final results.
   - Recommendation:
     - Re-run `npm run test` after addressing the open findings and append the fresh final count to this document.

2. Documentation and code have drifted apart in a few important onboarding areas
   - Files:
     - `README.md`
     - `docs/audit.md`
   - Evidence:
     - This was true earlier in the audit cycle, but the highest-impact README drift has now been corrected.
     - Remaining debt is mainly about keeping audit conclusions synchronized with the fast-moving codebase.
   - Recommendation:
     - Treat docs freshness as part of release-readiness, especially when native modules and platform-specific setup are involved.

3. Test coverage does not yet appear to explicitly lock every verified regression
   - Evidence from quick grep:
     - `tests/unit/sourceView.test.tsx` covers the new `source-loading` state.
     - No obvious focused tests were found for `RouteNotFound`, skip-link parity on `/now-playing`, or Settings tab ARIA linkage.
   - Impact:
     - The fixes exist now, but some could regress silently without targeted tests.
   - Recommendation:
     - Add focused unit/integration coverage for route fallback rendering, skip-link target parity, and Settings tab semantics.

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

1. Sync audit/reporting documents quickly when the codebase changes, so resolved items are not left marked as open.
2. Add targeted regression tests for the recently fixed route, accessibility, and hydration issues.

### Recommended Next Priorities

1. Add targeted tests for `RouteNotFound`, skip-link parity, and Settings tab semantics.
2. Keep `docs/audit.md` and `README.md` aligned with reality after each bug-fix batch.
