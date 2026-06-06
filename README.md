# Harmonix

> A unified cross-source music player for desktop — Spotify, YouTube Music, Deezer, Jamendo, Audius, SoundCloud, and local files in one place.

> **Status**: ✅ Phase 13B (Soundora-inspired Layout Redesign) complete. Pink/magenta brand palette, 3-column shell (Sidebar + Main + RightRail), audio-reactive background, hero player with vinyl, and 423/423 tests passing across 38 test files. **M14 Done.** See [`docs/PLANNING.md`](docs/PLANNING.md) for the full roadmap.

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
- ✅ Top bar — global search + notifications + settings (Phase 13B)
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
- ✅ Brand mark in sidebar (public/logo.png served at `/logo.png`)
- ✅ Splash screen on app open (logo + wordmark + tagline + spinner)
- ✅ Gapless playback (pre-buffered next track, no gap between songs)
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

> **Memory note**: The dev/build/preview scripts pre-allocate a Node.js V8 heap of 8 GB. This matches the main process runtime config (`HARMONIX_MAX_HEAP_MB=3072` in `electron/main/index.ts`) plus a generous buffer for the build pipeline. If you need to lower it, edit the script flags in `package.json` — the minimum safe value is ~4 GB for full builds.

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

| Milestone | Scope                                                                   | Status     |
| --------- | ----------------------------------------------------------------------- | ---------- |
| M1–M9     | Foundation, sources, player, EQ, library, UI integration                | ✅ Done    |
| M10       | Mini-player mode + system tray                                          | ✅ Done    |
| M11       | AI-powered playlist generation                                          | 🔜 Planned |
| M12       | UI/UX polish (navigation, controls, micro-interactions)                 | ✅ Done    |
| M13       | Visual immersion (palette, glassmorphism, audio-reactive, now-playing)  | ✅ Done    |
| M14       | Layout redesign (3-column shell, pink palette, hero player, right rail) | ✅ Done    |

## Recent Progress (active session)

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
- Layout language inspired by [Soundora](https://soundora.com/) — design language only, no copied branding.
- Built with amazing open-source libraries. See `package.json` for the full list.
