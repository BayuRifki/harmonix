# Harmonix Audit

Date: 2026-06-16

## Baseline

- `npm run lint` -> pass
- `npm run typecheck` -> pass
- `npm run test` -> current rerun showed `1 failed | 114 passed` test files
- Test stderr/filter check did not surface `act(...)` or React Router future-flag warnings in the latest sampled output, but the suite is not currently fully green

## Latest Findings

### Bugs

1. Sidebar mount refreshes are improved but still potentially eager
   - File: `src/components/layout/Sidebar.tsx`
   - Refreshes are now guarded by empty-state checks, which is better than unconditional mount refreshes.
   - However, `stats.trackCount === 0` / empty registrations / empty playlists can still trigger refetch churn in legitimate empty-library states.

### UI/UX Optimization Opportunities

1. Home `Because you listened` is improved, but still history-driven rather than a distinct recommendation engine
   - Files:
     - `src/features/home/HomeView.tsx`
     - `src/components/recommendations/ForYouSection.tsx`
   - Uses `ForYouSection` plus empty-state CTAs, but item selection still comes from recent listening history.
   - This is acceptable for now; a distinct recommendation engine would require additional backend or API integration.

2. Search row actions remain hover-heavy
   - File: `src/features/search/SearchView.tsx`
   - Current row actions still use `opacity-0 group-hover:opacity-100 focus:opacity-100`.
   - Touch/smaller-screen discoverability is still a follow-up item.

3. SourceView playlist rows are improved, but still a valid refinement area
   - File: `src/features/source/SourceView.tsx`
   - Playlist rows now include a `ListMusic` icon, hover border highlight, and a `Play` icon/button.
   - They are better than before, but still relatively terse for dense scanning.

4. Sidebar top-level density is reduced, but still an IA decision area
   - Files:
     - `src/components/layout/Sidebar.tsx`
   - Grouping may exist in pending/local work, but the current checked file does not show `Browse` / `Collection` / `Tools` section labels in the rendered nav block reviewed here.

5. Slider affordances in Now Playing are improved
   - File: `src/features/nowPlaying/NowPlayingView.tsx`
   - Thumbs are now larger (`w-3.5 h-3.5`) with a `brand-500` border and shadow.
   - Whether this is the final desired visual treatment remains a product decision.

### Testing / Technical Debt

1. Mount-time refresh side effects are reduced but not eliminated as a source of test/runtime churn.

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

17. Sidebar mount refreshes now guarded by hydration state
    - `src/components/layout/Sidebar.tsx`
    - refresh only triggers when playlists, sources, or library stats are empty

18. SourceView playlist rows improved scanability
    - `src/features/source/SourceView.tsx`
    - `ListMusic` icon added, hover border, Play button with icon

19. Now Playing slider handles made more prominent
    - `src/features/nowPlaying/NowPlayingView.tsx`
    - larger thumbs with `brand-500` border and shadow

### Still Open

1. Current test suite is not fully green in the latest rerun
   - latest sampled output showed `1 failed | 114 passed` test files

2. Search row secondary-action discoverability is still hover-heavy
   - `src/features/search/SearchView.tsx`

3. Sidebar mount refresh logic is improved but still a follow-up area
   - `src/components/layout/Sidebar.tsx`

4. Home `Because you listened` remains history-driven
   - `src/features/home/HomeView.tsx`
   - `src/components/recommendations/ForYouSection.tsx`

### Recommended Next Priorities

1. Fix the currently failing test so the baseline is fully green again.
2. Decide whether `Because you listened` should remain history-driven or move to a distinct recommendation engine.
3. Improve Search action discoverability on touch/smaller screens by exposing at least one non-hover secondary action.
4. Continue reducing Sidebar mount-time refetch churn in legitimately empty states.
5. Decide whether Sidebar IA grouping needs an explicit labeled grouping treatment.
6. Decide whether the current more-prominent Now Playing slider handles are final.
