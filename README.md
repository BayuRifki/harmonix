# Harmonix

> A unified cross-source music player for desktop — Spotify, YouTube Music, and local files in one place.

> **Status**: ✅ Phase 9 (UI Integration) complete. All 8 sources now have first-class UI affordances: per-source landing views, capability-aware sidebar nav, source indicator badge on the player, per-source config dialog, and an updated home screen. 21 new component tests, **284/284 green across 24 test files**. Pending: code signing + first public release (v0.1.0). See [`docs/PLANNING.md`](docs/PLANNING.md) for the roadmap.

---

## Why Harmonix?

Most music players lock you into a single ecosystem. Harmonix breaks that wall:

- **One search bar** for Spotify, YouTube Music, and your local library.
- **One player** with cross-source queue and shuffle.
- **One playlist** mixing tracks from any source.
- **Equalizer & effects** for sources that support audio processing.
- **Plugin-friendly**: add new sources without touching the core.

---

## Features

### Available Now

- ✅ Local music library scan (Phase 1)
- ✅ Plugin architecture with capability flags (Phase 2)
- ✅ Spotify integration — OAuth PKCE, search/playlists/liked tracks, Premium via Web Playback SDK, Free 30s preview (Phase 3)
- ✅ YouTube Music integration — `youtubei.js` search + `yt-dlp` stream resolution, mandatory disclaimer (Phase 4)
- ✅ **Deezer integration** — 30s previews, no auth, search/track/album/playlist (Phase 8)
- ✅ **Jamendo integration** — full CC-licensed indie streaming, free `client_id` works for read API, search/album/playlist/artist tracks (Phase 8)
- ✅ **Audius integration** — decentralized, no auth, search/track/playlist/trending/artist tracks (Phase 8)
- ✅ **SoundCloud integration** — public search + track info (requires `SOUNDCLOUD_CLIENT_ID` env var for full features, Artist Pro + app registration needed for OAuth) (Phase 8)
- ✅ Cross-source unified search with parallel fan-out
- ✅ Source enable/disable in Settings
- ✅ 10-band equalizer foundation (Phase 1)
- ✅ Cross-source playlists — create, rename, delete, drag-drop reorder, mix tracks from any source (Phase 5)
- ✅ Queue panel — now playing + history + up next, drag-to-reorder, shuffle, repeat (Phase 5)
- ✅ 10-band equalizer with 7 presets (Flat, Rock, Pop, Bass Boost, Vocal, Classical, Jazz) + custom save/load, persisted across sessions (Phase 6)
- ✅ Dark/light/system theme, app icon set (PNG + ICO), splash screen, virtualized TrackList (Phase 7)
- ✅ Memory optimization — Innertube singleton cache (no more ~250 MB leak per YT Music search), live memory panel with "Run GC" button, audio engine listener cleanup (Phase 7)
- ✅ **Per-source landing views** — `/source/:id` route shows source name, id, auth status, capability pills, "Search this source" deep-link, "Liked Tracks" section, and "Your Playlists" with expandable track lists (Phase 9)
- ✅ **Capability-aware sidebar** — "Sources" sub-section lists all enabled sources that support search/playlists/liked tracks, each linking to its landing view (Phase 9)
- ✅ **Source indicator on player bar** — colored badge shows the active track's source (green=Spotify, red=YT Music, blue=Local, etc.) (Phase 9)
- ✅ **Per-source config dialog** — ⚙ button in Settings opens a credentials editor for Spotify, Jamendo, Audius, and SoundCloud (Phase 9)
- ✅ **Unresolved track details** — playlists with broken tracks now show which source each one came from (Phase 9)
- ✅ **Search deep-linking** — `/search?source=spotify` pre-selects the source; toggling source pills updates the URL (Phase 9)
- ✅ **Refreshed home view** — version/platform cards, enabled source count, quick action grid, and a browseable list of enabled sources (Phase 9)
- ✅ **Mini-player mode** — compact 360×120 frameless floating window with current track, transport controls, clickable progress bar, and a right-click "always on top" toggle. Toggle from the player bar, the system tray, or `Ctrl/Cmd+Shift+M`. Playback stays in the main window; the mini is read-only and drives the engine via IPC (Phase 10)
- ✅ **System tray** — right-click menu (Show main, Show/Hide mini-player, Quit) with click-to-focus behavior (Phase 10)
- ✅ **Window position persistence** for the mini-player with display-bounds clamping (handles disconnected-monitor case) (Phase 10)

### Coming Next

- 🔜 AI-powered playlist generation (Phase 11)
- 🔜 Code signing + first public release (v0.1.0) — packaging finalization

See [`docs/PLANNING.md`](docs/PLANNING.md) for the full roadmap and phase breakdown.

---

## Tech Stack

| Layer     | Choice                  |
| --------- | ----------------------- |
| Shell     | Electron 30+            |
| UI        | React 18 + TypeScript 5 |
| Styling   | Tailwind CSS            |
| State     | Zustand                 |
| Build     | Vite + electron-vite    |
| Audio     | Web Audio API           |
| Local DB  | better-sqlite3          |
| Packaging | electron-builder        |
| Testing   | Vitest + Playwright     |

---

## Quick Start

> **Prerequisites**: Node.js 20+ and npm 10+.

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set up environment variables
cp .env.example .env
# Edit .env and add your Spotify Client ID if you want Spotify features.

# 3. Run the app in development mode
npm run dev

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

---

## Project Structure

```
harmonix/
├── docs/                  # All project documentation
│   ├── PLANNING.md        # Roadmap & phases
│   ├── ARCHITECTURE.md    # System design
│   ├── SOURCES.md         # How to add a new music source
│   ├── LEGAL.md           # Disclaimers
│   ├── CONTRIBUTING.md    # Contribution guide
│   └── ADR/               # Architecture Decision Records
├── electron/              # Electron main process
│   ├── main/              # Main process entry & modules
│   └── preload/           # contextBridge preload script
├── src/                   # React renderer
│   ├── components/        # UI components
│   ├── features/          # Feature modules (library, search, home, settings, playlist, source)
│   ├── stores/            # Zustand stores
│   └── lib/               # Audio engine & utilities
├── resources/             # Static assets (icons, binaries)
├── tests/                 # Tests
└── .github/               # GitHub templates & CI
```

---

## Legal & Disclaimer

Harmonix integrates with Spotify (official API) and YouTube Music (unofficial methods). Users are responsible for complying with the Terms of Service of each source. See [`docs/LEGAL.md`](docs/LEGAL.md) for the full disclaimer.

**TL;DR**: Use the official Spotify app for full Spotify playback. YouTube Music integration relies on unofficial methods and may break at any time.

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

## License

[MIT](LICENSE)

---

## Acknowledgments

- Inspired by players like [Nuclear](https://nuclear.js.org/) and [SpotTube](https://github.com/milesmanley/SpotTube).
- Built with amazing open-source libraries. See `package.json` for the full list.
