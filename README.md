# Harmonix

> A unified cross-source music player for desktop — Spotify, YouTube Music, Deezer, Jamendo, Audius, SoundCloud, and local files in one place.

> **Status**: ✅ Phase 13B (Soundora-inspired Layout Redesign) complete. ✅ **Phase 14.1 + 14.2 + 14.3 + 14.4 + 14.5 + 14.5.1 shipped** — `⌘K` command palette with **inline preview pane** (artwork + metadata + Play), breadcrumbs, smart sidebar (animated active indicator + **drag-to-reorder nav**), adaptive 3-tone palette + HSL interpolation, **manual theme override** (auto/brand/custom hex), glassmorphism system (`.glass`/`.glass-thin`/`.glass-heavy` with **glass intensity** off/subtle/strong), audio visualizers (**4 variants**: frequency bars + waveform ring + **particle field** + **stereo oscilloscope**, with **hardwareConcurrency auto-degrade**), shared element artwork transitions (PlayerBar ↔ HeroPlayer ↔ NowPlayingView ↔ MiniPlayer), artwork-blur backgrounds, **crossfade visual indicator (with tooltip)**, OS Media Session (system media keys), source health dots (click-to-expand), NowPlaying v2 (mouse parallax + similar tracks rail + credits panel + visualizer toggle + theme override), **LyricsPanel** (LRClib fetch + click-to-seek karaoke), **trackpad / touch gestures** (swipe / pinch / double-tap), QueueDrawer (slide-over, multi-select, save as playlist, search within queue, clear played, collapsible history section), MiniPlayer visible always-on-top badge + shared element transition + **artwork drop target** + **snap-to-edge**, ScrollShadow (CSS mask fade), rich toasts v2 (artwork + actions + **progress bar** for scans + spring), **optimistic UI** (instant playlist create/add/rename/reorder/delete with rollback on error), stagger animations, scroll restoration, accessibility (focus-ring, reduced-motion, high-contrast, skip-to-content, aria-live, route change indicator, prefers-contrast), Performance + Navigation + **Theme** settings panels (per-visualizer toggles, animation intensity, glass intensity, theme override, gestures toggle, snap points, scroll indicators, exit animations), search history dropdown, focus restoration on route change, mesh gradient breathing background, expandable PlayerBar (hover/pin with queue preview + EQ), MagneticButton, Ripple, RouteLoaderSkeleton, **Suspense-based route loading with skeleton fallbacks**, **dnd-kit drag-and-drop** (queue reorder, track → playlist, file → library scan, sidebar nav reorder, mini-player queue insert), **ImageLoader blur-up**, **HorizontalScroller** with snap points + scroll indicators, full keyboard navigation system (`Space`/`←→`/`Shift+←→`/`M`/`S`/`R`/`Q`/`J`/`K`/`G`/`H`/`L`/`↑↓`/`?`/command palette/mini-player), keyboard help overlay (`?`) with per-shortcut enable/disable toggles, search filters in SearchView (source, duration, artist) with URL deep-linking (`?src=&dur=&artist=`), FocusTrap utility wired into Modal + CommandPalette. 689/689 tests passing across 74 test files. **M14 + M15 + M16 + M17 + M18 Done.** See [`docs/PLANNING.md`](docs/PLANNING.md) for the full roadmap.

---

## Why Harmonix?

Most music players lock you into a single ecosystem. Harmonix breaks that wall:

- **One search bar** for Spotify, YouTube Music, Deezer, Jamendo, Audius, SoundCloud, and your local library.
- **One player** with cross-source queue, shuffle, repeat, and 10-band EQ.
- **One playlist** mixing tracks from any source.
- **Plugin-friendly**: add new sources without touching the core.

---

## Features

### Sources (8 integrated, 1 demo)

- ✅ **Local library** — file scanner + metadata extraction (Phase 1)
- ✅ **Spotify** — OAuth PKCE, search/playlists/liked tracks, Premium via Web Playback SDK, Free 30s preview (Phase 3)
- ✅ **YouTube Music** — `youtubei.js` search + `yt-dlp` stream resolution, mandatory disclaimer (Phase 4)
- ✅ **Deezer** — 30s previews, no auth, search/track/album/playlist (Phase 8)
- ✅ **Jamendo** — full CC-licensed indie streaming, free `client_id` works for read API (Phase 8)
- ✅ **Audius** — decentralized, no auth, search/track/playlist/trending/artist tracks (Phase 8)
- ✅ **SoundCloud** — public search + track info, optional OAuth via `SOUNDCLOUD_CLIENT_ID` (Phase 8)
- ✅ **Demo source** — hardcoded test tracks for offline development

### Player & Audio

- ✅ Cross-source unified search with parallel fan-out
- ✅ Cross-source queue — drag-to-reorder, shuffle, repeat (off/all/one)
- ✅ 10-band equalizer with 7 presets (Flat, Rock, Pop, Bass Boost, Vocal, Classical, Jazz) + custom save/load, persisted across sessions (Phase 6)
- ✅ Crossfade between tracks (Phase 13A)
- ✅ Source enable/disable in Settings
- ✅ Source indicator badge on the player bar (Phase 9)
- ✅ Per-source config dialog (⚙ in Settings) for Spotify, Jamendo, Audius, SoundCloud (Phase 9)

### Library & Playlists

- ✅ Cross-source playlists — create, rename, delete, drag-drop reorder, mix tracks from any source (Phase 5)
- ✅ Unresolved track details — playlists with broken tracks show which source each came from (Phase 9)
- ✅ Listening history — last 20 played tracks, persisted to localStorage, drives "FOR YOU" recommendations (Phase 13B)
- ✅ Search deep-linking — `/search?source=spotify` pre-selects the source; URL syncs with source pills (Phase 9)

### UI / Shell

- ✅ 3-column app shell — Sidebar (224px) + Main + RightRail (320px) with UP NEXT + FOR YOU (Phase 13B)
- ✅ Top bar — global search + notifications + settings + breadcrumbs + `⌘K` hint (Phase 13B + 14.1)
- ✅ Hero player — 288px artwork, peeking vinyl, pink radial glow, transport controls (Phase 13B)
- ✅ `/now-playing` fullscreen fanout (Phase 13A) — artwork-led view with crossfade-aware transitions
- ✅ Mini-player mode — 360×120 frameless floating window with click-to-focus; toggle from player bar, system tray, or `Ctrl/Cmd+Shift+M` (Phase 10)
- ✅ System tray — Show main, Show/Hide mini, Quit, click-to-focus (Phase 10)
- ✅ Window position persistence with display-bounds clamping for disconnected-monitor case (Phase 10)
- ✅ Per-source landing views — `/source/:id` shows auth status, capability pills, search deep-link, Liked Tracks, Your Playlists (Phase 9)
- ✅ Capability-aware sidebar — "Sources" sub-section lists all enabled sources (Phase 9)
- ✅ Refreshed home view — version/platform cards, enabled source count, quick action grid (Phase 9)
- ✅ Dark theme only with `framer-motion` transitions and cross-component glassmorphism (Phase 12 + 13A)
- ✅ Audio-reactive background canvas — pink-magenta radial gradients driven by FFT analysis (Phase 13A, with perf hardening in latest fixes)
- ✅ Animated ambient glow — soft pink conic-gradient blobs (Phase 13A + 13B palette)
- ✅ **Command palette** — `⌘K` / `Ctrl+K` global shortcut, fuzzy search across tracks/artists/albums/playlists/actions, recents + history sections, keyboard navigation (Phase 14.1)
- ✅ **Smart sidebar** — collapsible Playlists + Recents sections, Now Playing mini-card, command palette trigger, auto-recents (last 4 routes) (Phase 14.1)
- ✅ **Dynamic breadcrumbs** — per-route crumbs in TopBar (`Library › Albums`, `Sources › Spotify`, etc.) with `aria-current="page"` (Phase 14.1)
- ✅ **Global `uiStore`** — Zustand state for command palette, sidebar sections, recents, reduced motion, gestures (persisted to localStorage) (Phase 14.1)
- ✅ **Custom fuzzy matcher** — character-level scoring with consecutive + word-boundary bonuses, `highlightMatches` for inline match highlighting (Phase 14.1, no external dep)
- ✅ **Adaptive theming** — 3-tone palette (vibrant/muted/accent) extracted from current artwork, HSL interpolation between track changes (600ms), CSS vars injected as `--accent`, `--accent-vibrant`, `--accent-muted` (Phase 14.2)
- ✅ **Audio visualizers** — `FrequencyBars` (16-bar FFT-driven, 30 FPS) and `WaveformRing` (circular waveform synced to bass + mid), both respect `prefers-reduced-motion` and `uiStore.reducedMotion` (Phase 14.2)
- ✅ **Shared element transitions** — `layoutId="current-artwork"` on PlayerBar + HeroPlayer + NowPlayingView for seamless cross-route artwork morph (Phase 14.2)
- ✅ **Artwork-blur background** — scaled, blurred current artwork as ambient background layer behind the entire app (Phase 14.2)
- ✅ **Glassmorphism system** — `.glass-thin` / `.glass` / `.glass-heavy` Tailwind tokens with light-theme parity, applied to Sidebar / TopBar / PlayerBar / RightRail (Phase 14.2)
- ✅ **Crossfade visual indicator** — gradient overlay on seek bars showing the crossfade window from current track fade-out to next track fade-in (Phase 14.3)
- ✅ **OS Media Session integration** — system media keys (play/pause/next/prev/seek) work even when the app is in the background, with rich metadata (title/artist/artwork) on the OS-level media UI (Phase 14.3)
- ✅ **Source health indicator** — per-source status dots (🟢 healthy / 🟡 degraded / 🔴 down) in sidebar footer, polled every 60s via a quick search health check (Phase 14.3)
- ✅ **NowPlaying v2** — mouse parallax on artwork (spring-smoothed), similar tracks rail (5 cards from same artist), credits panel (collapsible: title/artist/album/duration/source) (Phase 14.3)
- ✅ **QueueDrawer** — slide-over with framer-motion spring animation, multi-select (checkboxes), search within queue, save selection as playlist, clear played/clear all, drag-to-reorder, plays the clicked track, respects `prefers-reduced-motion` (Phase 14.3)
- ✅ **MiniPlayer pin badge** — visible "Pin" indicator when always-on-top is enabled, instead of hiding it in the right-click context menu (Phase 14.3)
- ✅ **ScrollShadow** — CSS mask-image gradient fade at scroll container edges, auto-shows/hides based on scroll position (Phase 14.4)
- ✅ **Rich toasts v2** — artwork thumbnails, action buttons (View Queue, View Playlist, Undo), progress bars for sync operations, framer-motion enter/exit animations (Phase 14.4)
- ✅ **Stagger animations** — TrackList, search results, For You cards animate in with 20ms stagger using framer-motion variants; respects `prefers-reduced-motion` (Phase 14.4)
- ✅ **Scroll restoration** — per-route scroll position persisted to localStorage, auto-restored on navigation (Phase 14.4)
- ✅ **Accessibility upgrades** — global `.focus-ring` utility, `prefers-reduced-motion` disables all non-essential animations, `prefers-contrast: more` high-contrast theme, `prefers-color-scheme: light` parity for glass tokens (Phase 14.4)
- ✅ **Performance settings panel** — visualizer quality (Auto/High/Off), animation intensity (Full/Reduced/Off), reduced motion toggle, hardware info display (Phase 14.4)
- ✅ **Navigation settings panel** — sidebar layout (Default/Compact/Sectioned), breadcrumbs toggle, shortcut cheatsheet (Phase 14.4)
- ✅ **Animated sidebar active indicator** — `layoutId="sidebar-active-indicator"` springs between routes with brand-colored glow (Phase 14.5)
- ✅ **Search history dropdown** — TopBar search shows recent + fuzzy-matched queries with click-to-rerun and per-item remove (Phase 14.5)
- ✅ **Focus restoration** — per-route focus + scroll position restored on back-navigation (Phase 14.5)
- ✅ **NowPlaying visualizer toggle** — radiogroup toggles None / FrequencyBars / WaveformRing behind artwork (Phase 14.5)
- ✅ **NowPlaying theme override** — toggle "Match artwork" (adaptive palette) vs "Brand pink" (Phase 14.5)
- ✅ **Queue history collapsible section** — separated played-vs-upcoming in QueueDrawer with collapse toggle (Phase 14.5)
- ✅ **Crossfade tooltip** — hover the gradient indicator to see overlap duration in seconds (Phase 14.5)
- ✅ **Source health click-to-expand** — click dots to reveal "X minutes ago" timestamps per source (Phase 14.5)
- ✅ **Expandable PlayerBar** — hover or pin to show "Up next" queue preview (3 cards) + mini EQ (Phase 14.5)
- ✅ **Mini-player shared element transition** — `layoutId="current-artwork"` morphs artwork from main player to floating mini-player (Phase 14.5)
- ✅ **Magnetic hover + click ripples** — `MicroInteractions.tsx` with `MagneticButton` (cursor-tracked translate) and `Ripple` (Material-style click ripple) (Phase 14.5)
- ✅ **Route change indicator** — `RouteChangeIndicator` flashes a brand-gradient progress bar at top of page on navigation (Phase 14.5)
- ✅ **Route loader skeleton** — `RouteLoaderSkeleton` for future `lazy()` routes (Phase 14.5)
- ✅ **Skip-to-content link** — visible on focus, jumps to `#main-content` (Phase 14.5)
- ✅ **Glass audit** — `.glass-heavy` applied to CommandPalette; `bg-zinc-900/95` audited (Phase 14.5)

### Engineering / DX

- ✅ Dark/light/system theme (Phase 7)
- ✅ App icon set (PNG + ICO), splash screen, virtualized TrackList (Phase 7)
- ✅ Memory optimization — Innertube singleton cache (no more ~250 MB leak per YT Music search), live memory panel with "Run GC" button, audio engine listener cleanup (Phase 7)
- ✅ Renderer heap hardening (Phase 13B hotfix) — 30 FPS audio-reactive canvas, deferred initialization, DPR cap 1.5
- ✅ Build pipeline hardening (latest fixes) — esbuild 0.28.0 with override, Node heap 8 GB for build/dev
- ✅ 423 tests across 38 files, lint clean, typecheck clean
- ✅ 427 tests across 39 files (after yt-dlp bundle work), lint clean, typecheck clean
- ✅ 433 tests across 40 files (after Home For You + Sources removal cleanup), lint clean, typecheck clean
- ✅ 439 tests across 41 files (after brand + Explore page), lint clean, typecheck clean
- ✅ 446 tests across 42 files (after splash screen on open), lint clean, typecheck clean
- ✅ 446 tests across 42 files (after dead-code sweep: removed 7 unused files, 7 dead assets, 2 dead scripts, husky + lint-staged config), lint clean, typecheck clean
- ✅ 446 tests across 42 files (after DB swap sql.js → better-sqlite3, sync SQLite), lint clean, typecheck clean
- ✅ 455 tests across 43 files (after gapless pre-buffer: AudioEngine.preload + playerStore 80% trigger), lint clean, typecheck clean
- ✅ 465 tests across 44 files (after audio proxy + always-on MediaElementSource — EQ now works on YT Music + all remote sources), lint clean, typecheck clean
- ✅ 466 tests across 44 files (after proxy fix: registerSchemesAsPrivileged + fallback to direct URL + better error reporting), lint clean, typecheck clean
- ✅ 468 tests across 44 files (after format error fix: Node Readable → web stream + Range header forwarding), lint clean, typecheck clean
- ✅ 478 tests across 44 files (after content-type sniffing: WebM/MP3/MP4/OGG/WAV/FLAC magic-byte detection, override generic upstream Content-Type), lint clean, typecheck clean
- ✅ 478 tests across 44 files (after defensive Web Audio: ensureContext + createMediaElementSource + equalizer.connect all wrapped in try/catch, audio always plays with or without EQ), lint clean, typecheck clean
- ✅ 478 tests across 44 files (after the real root cause: `media-src` CSP in `index.html` missing `harmonix-media:` — added + comprehensive diagnostic logging in proxy + engine), lint clean, typecheck clean
- ✅ 479 tests across 44 files (after asWebStream helper: Electron 33+ net.fetch body is a web ReadableStream, not Node Readable; production case now covered by a test), lint clean, typecheck clean
- ✅ **533 tests across 48 files** (Phase 14.1 Navigation Intelligence: `+55` — CommandPalette 15, uiStore 14, fuzzyMatch 19, Breadcrumb 7), lint clean, typecheck clean
- ✅ **557 tests across 51 files** (Phase 14.2 Living Visuals: `+24` — adaptivePalette 11, audioVisualizer 9, artworkBlurBackground 3 + 1 from colorExtractor), lint clean, typecheck clean, build clean
- ✅ **578 tests across 55 files** (Phase 14.3 Player Mastery: `+21` — crossfadeIndicator 7, queueDrawer 8, sourceHealth 4, mediaSession 2), lint clean, typecheck clean, build clean
- ✅ **578 tests across 55 files** (Phase 14.5 Navigation & Player Polish: animated sidebar indicator, search history, focus restoration, NowPlaying visualizer/theme toggles, queue history section, crossfade tooltip, source health expand, glass audit, a11y upgrades, expandable PlayerBar, mini-player shared transition, magnetic/ripple micro-interactions, route change indicator), lint clean, typecheck clean, build clean
- ✅ **689 tests across 74 files** (Phase 14.5.1 — Phase 14 deferred-items catch-up: `+62` / `+12` — sidebar drag-to-reorder nav, FocusTrap in Modal/CommandPalette, focus-visible audit, ParticleField + StereoOscilloscope variants + hardwareConcurrency auto-degrade, ThemePanel with manual accent + glass intensity, per-visualizer Settings toggles, LyricsPanel (LRClib), useGestures (swipe/pinch/double-tap), MiniPlayer drop target + snap-to-edge, dnd-kit DnD (queue/playlist/file/sidebar/mini-player), ImageLoader blur-up, RouteFallback Suspense skeletons, HorizontalScroller with snap points + scroll indicators, uiStore + playerStore extensions), lint clean, typecheck clean, build clean
- ✅ Brand mark in sidebar (public/logo.png served at `/logo.png`)
- ✅ Splash screen on app open (logo + wordmark + tagline + spinner)
- ✅ Gapless playback (pre-buffered next track, no gap between songs)
- ✅ 10-band EQ applied to every source (local + remote via CORS proxy)
- ✅ CI pipeline (lint + typecheck + test)

### Coming Next

- 🔜 AI-powered playlist generation (Phase 11)
- 🔜 Code signing + first public release (v0.1.0) — packaging finalization

> **Deferred (intentionally)**: mobile/PWA, lyrics, cloud sync, social features, podcast support. See [`docs/PLANNING.md`](docs/PLANNING.md) for the rationale.

---

## Tech Stack

| Layer     | Choice               | Version                    |
| --------- | -------------------- | -------------------------- |
| Shell     | Electron             | 30+                        |
| UI        | React + TypeScript   | 18 / 5.6                   |
| Styling   | Tailwind CSS         | 3.4                        |
| Animation | framer-motion        | 12                         |
| State     | Zustand              | 5                          |
| Build     | Vite + electron-vite | 5 / 2                      |
| Bundler   | esbuild              | 0.28 (pinned via override) |
| Audio     | Web Audio API        | native                     |
| Local DB  | sql.js (SQLite WASM) | 1.12                       |
| YT Music  | youtubei.js + yt-dlp | 17 / ext.                  |
| Packaging | electron-builder     | 25                         |
| Testing   | Vitest + Playwright  | 2 / 1.48                   |

---

## Quick Start

> **Prerequisites**: Node.js 20+ (tested on 24) and npm 10+. `yt-dlp` is optional — required only for YouTube Music streaming. Get it from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases) or `pip install yt-dlp`.

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set up environment variables
cp .env.example .env
# Edit .env and add your Spotify Client ID if you want Spotify features.

# 3. Run the app in development mode
npm run dev
#   -> Main + preload + renderer dev server
#   -> Electron launches automatically when bundles are ready

# 4. Lint and type-check
npm run lint
npm run typecheck

# 5. Run tests
npm run test

# 6. Build distributable installers
npm run dist:win   # Windows
npm run dist:mac   # macOS
npm run dist:linux # Linux
```

> **Memory note**: The dev/build/preview scripts pre-allocate a Node.js V8 heap of 8 GB. This matches the main process runtime config (`HARMONIX_MAX_HEAP_MB=6144` in `electron/main/index.ts`) plus a generous buffer for the build pipeline. If you need to lower it, edit the script flags in `package.json` or set `HARMONIX_MAX_HEAP_MB` in `.env` — the minimum safe value is ~4 GB for full builds.

---

## Project Structure

```
harmonix/
├── docs/                  # All project documentation
│   ├── PLANNING.md        # Roadmap & phases (single source of truth)
│   ├── ARCHITECTURE.md    # System design
│   ├── SOURCES.md         # How to add a new music source
│   ├── LEGAL.md           # Disclaimers
│   ├── CONTRIBUTING.md    # Contribution guide
│   └── ADR/               # Architecture Decision Records
├── electron/              # Electron main process
│   ├── main/              # Main process entry, IPC, sources, DB
│   │   ├── sources/       # SourceAdapter implementations (one per source)
│   │   ├── db/            # SQL.js repository layer
│   │   └── ipc/           # IPC handlers
│   └── preload/           # contextBridge preload script
├── src/                   # React renderer
│   ├── components/        # UI components (branding, layout, player, sidebar, recommendations)
│   ├── features/          # Feature modules (home, search, library, settings, source, miniPlayer)
│   ├── stores/            # Zustand stores (player, equalizer, playlists, listeningHistory, ...)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Audio engine, IPC client, utilities
│   └── types/             # Shared TypeScript types (cross-process)
├── resources/             # Static assets (icons, splash)
├── scripts/               # Build/utility scripts
├── tests/                 # Vitest unit tests + Playwright e2e
└── .github/               # GitHub templates & CI
```

---

## Recent Milestones

| Milestone | Scope                                                                   | Status                       |
| --------- | ----------------------------------------------------------------------- | ---------------------------- |
| M1–M9     | Foundation, sources, player, EQ, library, UI integration                | ✅ Done                      |
| M10       | Mini-player mode + system tray                                          | ✅ Done                      |
| M11       | AI-powered playlist generation                                          | 🔜 Planned                   |
| M12       | UI/UX polish (navigation, controls, micro-interactions)                 | ✅ Done                      |
| M13       | Visual immersion (palette, glassmorphism, audio-reactive, now-playing)  | ✅ Done                      |
| M14       | Layout redesign (3-column shell, pink palette, hero player, right rail) | ✅ Done                      |
| M15       | Advanced UI/UX polish — Phase 14 (3 increments)                         | ✅ Done (14.1 + 14.2 + 14.3) |
| M16       | Micro-interactions & Polish — Phase 14.4                                | ✅ Done                      |
| M17       | Navigation & Player polish — Phase 14.5                                 | ✅ Done                      |
| M18       | Phase 14 deferred-items catch-up (14.1 + 14.2 + 14.3 + 14.4 → 14.5.1)   | ✅ Done                      |

## Recent Progress (active session)

- **Phase 14.7 — Critical Bug Fixes & UX Polish (Batch 1) shipped** — Fixed high-priority bugs and UX issues from Phase 14.7 audit:
  - **MiniPlayerView**: Replaced emoji icons with Lucide React icons; added real `mini-player:set-bounds` IPC for programmatic snap-to-edge; fixed context menu and added `focus-ring` classes.
  - **NowPlayingView**: Replaced inline `ShuffleIcon` SVG with Lucide `Shuffle` icon; removed local component.
  - **HeroPlayer**: Added functional \"Add to favorites\" button with find-or-create Favorites playlist logic, optimistic UI, toast feedback.
  - **PlayerBar**: Added `focus-ring` to queue, pin toggle, mini-player, now-playing, and mute buttons for keyboard accessibility.
  - **useGestures**: Removed dead code; fixed target ref handling with persistent `targetRef` for proper event listener cleanup.
  - **ArtworkBlurBackground test fix**: Added `removeAttribute` mock to prevent jsdom error.
  - **Quality gates**: All 792 tests pass, typecheck clean, lint clean (0 errors).

- **Phase 14.5.1 — Phase 14 deferred-items catch-up (14.1 + 14.2 + 14.3 + 14.4) shipped** — Single-pass close-out...

- **Phase 14.5 — Navigation & Player polish shipped** — Animated sidebar active indicator (Framer Motion `layoutId` springs between routes with brand glow); search history dropdown in TopBar (fuzzy-matched recent queries, click-to-rerun, per-item remove); focus restoration on route change (per-route focus + scroll); NowPlaying v2 visualizer toggle (None/FrequencyBars/WaveformRing radiogroup behind artwork); mesh gradient breathing background (conic-gradient blobs that scale with bass pulse + adaptive palette); NowPlaying theme override (Match Artwork vs Brand Pink toggling CSS vars); QueueDrawer collapsible history section (played-vs-upcoming split with collapse toggle); Crossfade tooltip on indicator (hover shows "5.0s overlap"); source health click-to-expand (reveals "Xm ago" per source); glass audit (`.glass-heavy` applied to CommandPalette); skip-to-content link (focus-visible, jumps to `#main-content`); aria-live for queue changes (debounced 600ms announcer); expandable PlayerBar (hover/pin shows "Up next" 3-card queue preview + mini EQ with smooth height animation); mini-player shared element transition (`layoutId="current-artwork"` morphs to floating mini-player); MagneticButton (cursor-tracked translate+scale, respects reduced motion); Ripple (Material-style click ripple, framer-motion 0.6s fade); RouteChangeIndicator (top progress bar flashes on navigation); RouteLoaderSkeleton (for future lazy routes). New files: `src/hooks/useSearchHistory.ts`, `src/hooks/useFocusRestoration.ts`, `src/components/a11y/PlayerAnnouncer.tsx`, `src/components/a11y/SkipToContent.tsx`, `src/components/a11y/RouteLoader.tsx`, `src/components/ui/MicroInteractions.tsx`. Modified: `src/components/layout/Sidebar.tsx` (layoutId indicator + health expand), `src/components/layout/TopBar.tsx` (search history dropdown), `src/components/layout/PlayerBar.tsx` (expandable + pin), `src/components/player/CrossfadeIndicator.tsx` (tooltip), `src/features/nowPlaying/NowPlayingView.tsx` (visualizer toggle + theme override), `src/features/player/QueueDrawer.tsx` (collapsible history), `src/features/miniPlayer/MiniPlayerView.tsx` (shared element), `src/features/library/TrackList.tsx` (motion.tr + itemVariants), `src/components/command/CommandPalette.tsx` (glass-heavy), `src/components/layout/AnimatedBackground.tsx` (mesh breathing + bass pulse), `src/App.tsx` (PlayerAnnouncer + SkipToContent + RouteChangeIndicator + id="main-content"). **578/578 tests pass**. Lint clean, typecheck clean, build clean.
- **Phase 14.4 — Micro-interactions & Polish shipped** — ScrollShadow (CSS mask-image gradient fade at scroll edges), rich toasts v2 (artwork + action buttons + progress bars + framer-motion animations), stagger animations for TrackList/search/ForYou (20ms stagger, prefers-reduced-motion support), scroll restoration per route (localStorage), accessibility upgrades (global `.focus-ring`, prefers-reduced-motion disables animations, prefers-contrast high-contrast theme, light-mode glass parity), Performance settings panel (visualizer quality, animation intensity, reduced motion toggle, hardware info), Navigation settings panel (sidebar layout modes, breadcrumbs toggle, shortcut cheatsheet). New files: `src/components/ui/ScrollShadow.tsx`, `src/components/ui/StaggerAnimations.tsx`, `src/hooks/useScrollRestoration.ts`, `src/features/settings/PerformancePanel.tsx`, `src/features/settings/NavigationPanel.tsx`. Modified: `src/components/ui/Toast.tsx` + `toastStore.ts` (rich toasts v2), `src/index.css` (focus-ring, reduced-motion, high-contrast, light-mode glass), `src/features/library/TrackList.tsx` (stagger animations), `src/features/player/QueueDrawer.tsx` (ScrollShadow), `src/features/settings/SettingsView.tsx` (new panels). **578/578 tests pass**. Lint clean, typecheck clean, build clean.
- **Phase 14.3 — Player Mastery shipped** — Crossfade visual indicator (gradient overlay on seek bars in NowPlayingView), OS Media Session integration (`useMediaSession` hook wires play/pause/next/prev/seek + metadata title/artist/artwork), source health indicator in Sidebar footer (per-source colored dots, polled every 60s via lightweight search health check, downgraded/degraded/unknown status), NowPlaying v2 (mouse parallax on artwork with spring-smoothed `useMotionValue`+`useSpring`, similar tracks rail showing 5 cards from the same artist drawn from listening history + library, collapsible credits panel), and a comprehensive QueueDrawer (slide-over with framer-motion spring, search within queue, multi-select with checkboxes, save selection as new playlist, clear played, clear all, drag-to-reorder) replacing the simpler QueuePanel. MiniPlayer v2 adds a visible "Pin" badge when always-on-top is enabled. New files: `src/components/player/CrossfadeIndicator.tsx` (7 tests), `src/hooks/useMediaSession.ts` (2 tests), `src/hooks/useSourceHealth.ts` (4 tests), `src/features/player/QueueDrawer.tsx` (8 tests). Modified: `src/lib/audio/crossfade.ts` (added pub-sub via `subscribeCrossfadeConfig` for React reactivity), `src/components/layout/PlayerBar.tsx` (replaced `QueuePanel` with `QueueDrawer`), `src/features/nowPlaying/NowPlayingView.tsx` (parallax + similar rail + credits + crossfade indicator), `src/components/layout/Sidebar.tsx` (source health dots), `src/features/miniPlayer/MiniPlayerView.tsx` (visible "Pin" badge), `src/App.tsx` (`useMediaSession()` mounted). **578/578 tests pass** (was 557, +21). Lint clean, typecheck clean, build clean.
- **Phase 14.2 — Living Visuals shipped** — 3-tone adaptive palette (vibrant/muted/accent) extracted from current artwork with HSL interpolation (600ms easing) between track changes, audio visualizers (`FrequencyBars` for compact contexts, `WaveformRing` for immersive), shared element transitions (`layoutId="current-artwork"`) across PlayerBar → HeroPlayer → NowPlayingView, glassmorphism system (`.glass-thin` / `.glass` / `.glass-heavy` with light-theme parity), and artwork-blur background that lives behind the entire app. Implementation: `src/lib/colorExtractor.ts` (palette + interpolation helpers), `src/hooks/useAdaptiveAccent.ts` (rewritten with `requestAnimationFrame` interpolation), `src/components/visualizers/AudioVisualizer.tsx` (frequency bars + waveform ring + `useAudioAnalyser` hook), `src/components/layout/ArtworkBlurBackground.tsx`, `src/index.css` (glass tokens + light-theme parity), `tailwind.config.ts` (new `artworkPulse` + `sharedMorph` keyframes, `glass-inner` shadow, `backdrop-blur-4xl`). Glass applied to Sidebar, TopBar, PlayerBar, RightRail. Mini equalizer animation on PlayerBar artwork when playing. **557/557 tests pass** (+24: 11 adaptivePalette, 9 audioVisualizer, 3 artworkBlurBackground, 1 colorExtractor). Lint clean, typecheck clean, build clean. Next: Phase 14.3 (Player Mastery).
- **Phase 14.1 — Navigation Intelligence shipped** — `⌘K` / `Ctrl+K` command palette with custom fuzzy matcher (no external dep, ~90 LOC), smart sidebar (now-playing mini-card, collapsible Playlists + Recents sections, command-palette trigger, auto-recents for last 4 routes), dynamic breadcrumbs in TopBar, and a new `uiStore` (Zustand) for global UI state. The palette searches tracks/artists/albums/playlists/actions with inline match highlighting, keyboard navigation (`↑`/`↓`/`Enter`/`Esc`), and a 25-item limit. Implementation: `src/stores/uiStore.ts`, `src/components/command/CommandPalette.tsx` + `fuzzyMatch.ts`, `src/components/layout/Breadcrumb.tsx`; `Sidebar.tsx` + `TopBar.tsx` refactored. **533/533 tests pass** (+55: 14 uiStore, 19 fuzzyMatch, 7 Breadcrumb, 15 CommandPalette). Next: Phase 14.2 (Living Visuals). Full plan in `docs/PLANNING.md` §14.
- **Bundled `yt-dlp.exe`** — `resources/yt-dlp.exe` (v2026.03.17) shipped in-repo. No external install, no `YT_DLP_PATH` env var. Resolution order: `YT_DLP_PATH` env → `resources/yt-dlp[.exe]` (dev & packaged unpacked) → `process.resourcesPath/yt-dlp[.exe]` → PATH. Settings → YouTube Music → "Check for update" runs `yt-dlp -U` and shows commit reminder when version bumps. See `docs/PLANNING.md` §10 for the full progress log.
- **Sources section removed + Home For You** — Sidebar and Home no longer render a Sources sub-nav/grid; the global TopBar search is the single entry point across all enabled sources. Home now shows a 6-card "For You" grid sourced from listening history (with starter cards for new users). Shared `ForYouSection` component drives both Home (grid) and RightRail (list).
- **Splash screen on app open** — Frameless 360×360 always-on-top window shows the brand mark + "HARMONIX" wordmark + tagline + spinner while the main window initializes. Closes on main window `ready-to-show`. 15s safety auto-close. Implementation in `electron/main/splashWindow.ts`; HTML inlined as a `data:` URL, logo URL passed as a hash fragment so Vite-served assets resolve at runtime.

See [`docs/PLANNING.md`](docs/PLANNING.md) for the full phase breakdown and decision log.

---

## Contributing

Contributions are welcome! Whether you're fixing a typo, adding a new source, or refactoring the audio engine, please read [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) first.

**Quick links:**

- [Architecture](docs/ARCHITECTURE.md)
- [Planning & Roadmap](docs/PLANNING.md)
- [Adding a New Source](docs/SOURCES.md)
- [Contributing Guide](docs/CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

---

## Legal & Disclaimer

Harmonix integrates with Spotify (official API) and YouTube Music (unofficial methods). Users are responsible for complying with the Terms of Service of each source. See [`docs/LEGAL.md`](docs/LEGAL.md) for the full disclaimer.

**TL;DR**: Use the official Spotify app for full Spotify playback. YouTube Music integration relies on unofficial methods and may break at any time. Deezer/Jamendo/Audius/SoundCloud integrations use their public APIs under their respective terms.

---

## License

[MIT](LICENSE)

---

## Acknowledgments

- Inspired by players like [Nuclear](https://nuclear.js.org/) and [SpotTube](https://github.com/milesmanley/SpotTube).
- Layout language and command-palette patterns inspired by [Soundora](https://soundora.com/) and [Linear](https://linear.app/) — design language only, no copied branding.
- Built with amazing open-source libraries. See `package.json` for the full list.
