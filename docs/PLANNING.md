# Harmonix — Project Planning & Roadmap

> **Purpose**: This document is the single source of truth for what Harmonix is, where it's going, and how we'll get there. Any contributor (solo or team) should be able to read this and pick up where the last person left off.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Success Criteria](#3-success-criteria)
4. [Phased Roadmap](#4-phased-roadmap)
5. [Milestones](#5-milestones)
6. [Decision Log](#6-decision-log)
7. [Risk Register](#7-risk-register)
8. [Backlog & Future Ideas](#8-backlog--future-ideas)
9. [How to Resume This Project](#9-how-to-resume-this-project)

---

## 1. Project Overview

**Harmonix** is a cross-platform desktop music player built with Electron + React + TypeScript. It aggregates content from multiple music sources (Spotify, YouTube Music, local files) into a single unified interface.

**Key principle**: Everything is a `MusicSource` plugin. The core app is source-agnostic.

---

## 2. Goals & Non-Goals

### Goals (MVP)

- ✅ Unified search across all configured sources
- ✅ Single player with queue, shuffle, and repeat
- ✅ Playlists that mix tracks from different sources
- ✅ Local music library with metadata extraction
- ✅ Spotify integration (Premium playback, Free preview fallback)
- ✅ YouTube Music integration (with disclaimer)
- ✅ 10-band equalizer with presets
- ✅ Cross-platform: Windows, macOS, Linux

### Non-Goals (Out of Scope for MVP)

- ❌ Mobile apps (consider post-MVP)
- ❌ Web version (consider post-MVP)
- ❌ Cloud sync of user data (consider post-MVP)
- ❌ Social features (sharing, following, etc.)
- ❌ Podcast support (consider as a future source plugin)
- ❌ Lyrics display (consider post-MVP)
- ❌ DRM removal or piracy tools

---

## 3. Success Criteria

The MVP is considered successful when:

1. A user can search for a track and see results from Spotify, YouTube Music, and their local library in one view.
2. A user can create a playlist with tracks from all three sources and play them sequentially.
3. The player supports play/pause/next/prev/seek/shuffle/repeat/volume.
4. The 10-band EQ works for local and YouTube Music tracks.
5. The app installs and runs on Windows, macOS, and Linux.
6. All public APIs are documented.
7. The codebase has >60% test coverage on core modules.
8. A new contributor can add a new source by reading [`docs/SOURCES.md`](SOURCES.md) alone.

---

## 4. Phased Roadmap

> Each phase is **independently shippable**. A phase can be released as a "beta" or "alpha" version even if later phases aren't done.

### Phase 0 — Foundation ✅ (Initial scaffolding)

- [x] Project structure and documentation
- [x] Electron + Vite + React + TypeScript scaffold
- [x] ESLint, Prettier, Husky configuration
- [x] CI pipeline (lint + typecheck + test)
- [x] GitHub issue/PR templates
- [x] Architecture Decision Records (ADR) framework
- [x] Hello-world app shell (sidebar + main view + player bar layout)

**Exit criteria**: `npm run dev` launches the app shell with a "Hello, Harmonix!" message.

---

### Phase 1 — Local Library ✅

- [x] Folder picker dialog
- [x] Recursive music file scanner
- [x] Metadata extraction (ID3, FLAC, OGG, M4A, etc.)
- [x] SQLite database for library index (sql.js)
- [x] Library views: Tracks, Albums, Artists
- [x] Web Audio API playback engine
- [x] Basic player controls: play/pause/seek/volume/next/prev
- [x] Queue, shuffle, repeat (foundation)
- [x] 10-band equalizer foundation

**Dependencies**: `music-metadata`, `sql.js`, `chokidar` (for future watch mode)

**Exit criteria**: User can point Harmonix at a music folder, see their library, and play tracks. ✅ MET

---

### Phase 2 — Source Adapter Interface ✅

- [x] Define `MusicSource` interface (search, getTrack, getStreamUrl, getPlaylist)
- [x] Define shared `Track`, `Album`, `Playlist` types
- [x] Refactor local files as the first source adapter
- [x] Source registry & plugin loader
- [x] Unified search UI (multi-tab results)
- [x] `SourceAdapter` base class with capability flags (canSearch/canStream/etc.)
- [x] Source enable/disable via Settings UI
- [x] `DemoSource` as proof-of-concept for third-party plugins
- [x] Source filter in Library view
- [x] Source label badge per track
- [x] Per-source config persistence (SQLite settings)
- [x] Cross-source search IPC with parallel source fan-out
- [x] Unified `sources:play-track` IPC replacing `library:play-track`

**Exit criteria**: The local file source is implemented as a `MusicSource` plugin, and the architecture is documented for adding more. ✅ MET

**New contributor onboarding**: See [`docs/SOURCES.md`](SOURCES.md) — the minimal source template is now ~20 lines.

---

### Phase 3 — Spotify Integration ✅

- [x] OAuth 2.0 PKCE flow (mini HTTP server in main process, state validation, CSRF protection)
- [x] Token storage via Electron's `safeStorage` (OS-level encryption)
- [x] Spotify Web API client (search, getTrack, getUserPlaylists, getPlaylist, getLikedTracks)
- [x] Web Playback SDK integration in renderer (Premium only)
- [x] 30-second preview fallback (Free users)
- [x] Token refresh logic (auto-refresh on 401)
- [x] `SpotifySource` adapter extending `SourceAdapter`
- [x] Auth IPC handlers: `auth:spotify:login`, `auth:spotify:logout`, `auth:spotify:status`
- [x] LoginButton UI with setup instructions when Client ID is missing
- [x] Per-account tier detection (Free vs Premium)
- [x] CSP allowlist for `sdk.scdn.co`, `api.spotify.com`, `accounts.spotify.com`
- [x] Unit tests: PKCE (8), SpotifySource (11) — 19 new tests, 72 total

**Exit criteria**: User can log in to Spotify, search for tracks, and play them. ✅ MET (full playback for Premium, 30s preview for Free).

**Setup**: User must create a Spotify app at developer.spotify.com and set `SPOTIFY_CLIENT_ID` in `.env`. See `LoginButton` UI for step-by-step instructions.

**Legal note**: Spotify requires app review and compliance with their [Developer Terms](https://developer.spotify.com/terms/). Documented in [`docs/LEGAL.md`](LEGAL.md).

---

### Phase 4 — YouTube Music Integration ✅

- [x] `youtubei.js` for search and metadata (music client, no auth)
- [x] `yt-dlp` subprocess wrapper with multi-path discovery (`YT_DLP_PATH` env, `resources/`, `process.resourcesPath`, PATH)
- [x] Stream URL resolution via `yt-dlp -g` (audio-only, m3u8/yt-dlp/http protocol detection)
- [x] **Mandatory disclaimer modal** that blocks app until accepted (persisted via `SourceAdapter` config)
- [x] Graceful failure when `yt-dlp` is missing (no crash, clear error)
- [x] `YouTubeMusicSource` adapter extending `SourceAdapter`
- [x] IPC handlers: `ytmusic:disclaimer-text`, `ytmusic:requires-disclaimer`, `ytmusic:acknowledge-disclaimer`, `ytmusic:status`
- [x] `YtMusicStatus` UI panel in Settings (shows yt-dlp version or install instructions)
- [x] Lazy `app` injection for testability (no top-level Electron imports in tested modules)
- [x] Unit tests: 10 new tests for `YouTubeMusicSource` — **81 total**

**Exit criteria**: User can acknowledge disclaimer, search YouTube Music (when yt-dlp is installed), and play tracks. ✅ MET (with dependency caveat).

**Setup**: User must install [yt-dlp](https://github.com/yt-dlp/yt-dlp) and have it on PATH or at `YT_DLP_PATH`.

**Legal note**: This integration is unofficial and may violate YouTube's ToS. See [`docs/LEGAL.md`](LEGAL.md).

---

### Phase 5 — Playlists & Queue ✅

- [x] Cross-source playlist data model (playlist + playlist_tracks tables in sql.js, 2-pass reorder with temp offset to avoid position collisions)
- [x] Drag & drop reorder in `PlaylistDetailView` (HTML5 native DnD)
- [x] `playlistRepository` with full CRUD: create / rename / delete / addTrack / removeTrack / reorder / setPlaylistTracks / countPlaylistTracks
- [x] Cross-source `playlistResolver` — resolves `source:trackId` URIs to live `Track` objects from any enabled source
- [x] 9 IPC handlers: `playlists:list`, `playlists:get`, `playlists:create`, `playlists:rename`, `playlists:delete`, `playlists:add-track`, `playlists:remove-track`, `playlists:reorder`
- [x] `playlistsStore` Zustand store with refresh / load / create / rename / remove / addTrack / removeTrack / reorder / playAll
- [x] `PlaylistsView` list view (create / rename / delete UI with confirmation)
- [x] `PlaylistDetailView` with drag-drop reorder, double-click to play, inline rename, unresolved track warning
- [x] `AddToPlaylistMenu` modal picker — accessible from any track row's "+" button
- [x] `QueuePanel` (now playing + history + up next) with drag-to-reorder, accessible from `PlayerBar` queue toggle with badge count
- [x] "Add to playlist" button on every track in `TrackList`
- [x] Shuffle + repeat already in place from Phase 1 (`playerStore`); verified with new test suite
- [x] `__setDbForTest` injection in `database.ts` for testability
- [x] Unit tests: `playlistRepository` (11), `playlistsStore` (15) — **107 total**
- [x] Test infrastructure cleanup: removed duplicate `cleanup()` in `tests/setup.ts` (RTL v16 auto-registers); refactored `playerStore.test.ts` to use direct `getState()` instead of `renderHook` (avoids `singleThread: true` race)

**Exit criteria**: User can create a playlist with tracks from multiple sources, reorder them, and play with shuffle/repeat. ✅ MET

---

### Phase 6 — Equalizer & Audio Effects ✅

- [x] 10-band `BiquadFilter` chain on Web Audio API (`src/lib/audio/equalizer.ts`) — 32Hz/64/125/250/500/1k/2k/4k/8k/16kHz, peaking filter, Q=1.4, -12/+12 dB clamp
- [x] 7 built-in presets (Flat, Rock, Pop, Bass Boost, Vocal, Classical, Jazz) — defined in `src/lib/audio/presets.ts` and `electron/main/sources/presets.ts`
- [x] Custom preset save / load / delete via `eq_presets` SQLite table (migration 2)
- [x] Persisted EQ state (active preset + current gains) across sessions via `settings` table keys `eq.activePreset` + `eq.currentGains`
- [x] `eqRepository` with full CRUD + gain clamping
- [x] 6 IPC handlers: `eq:get-state`, `eq:save-state`, `eq:list-all-presets`, `eq:list-custom-presets`, `eq:save-custom-preset`, `eq:delete-custom-preset`
- [x] `equalizerStore` Zustand store with 500ms debounced persist, applies to engine on every change
- [x] `EqualizerView` UI: 10 vertical sliders with band labels (32/64/125/.../16k Hz), preset dropdown (built-in + custom), save-as modal, delete custom, reset-to-Flat
- [x] Spotify-limitation notice in UI tooltip ("EQ does not apply to Spotify Web Playback SDK streams")
- [x] Auto-load EQ state on app start (`App.tsx` useEffect → `useEqualizerStore.load()`)
- [x] Unit tests: presets (18), eqRepository (13), equalizerStore (13) — 44 new tests, **151 total**

**Limitation**: EQ does NOT apply to Spotify Web Playback SDK streams (Spotify controls the audio output). Documented in the UI badge.

**Exit criteria**: EQ works for local and YouTube Music tracks. Presets can be saved and loaded. ✅ MET

---

### Phase 7 — Polish & Release ✅ (Memory Optimized)

---

### Phase 8 — Additional Sources ✅

- [x] **Deezer** (`electron/main/sources/deezer/`): public API, no auth, 30s MP3 previews. Capabilities: search + stream + getTrack + getAlbumTracks + getPlaylistTracks + getArtistTopTracks. Track ID format `deezer:{numericId}`. 30-min preview URL expiry. **29 tests**
- [x] **Jamendo** (`electron/main/sources/jamendo/`): requires `JAMENDO_CLIENT_ID` env var (defaults to public test id `709fa152`). Full CC-licensed indie streaming (no preview limit). Capabilities: search + stream + getTrack + getAlbumTracks + getPlaylist + getPlaylistTracks + getArtistTracks + getPopularTracks. Track ID format `jamendo:{trackId}`. **17 tests**
- [x] **Audius** (`electron/main/sources/audius/`): decentralized, no auth, discovery node configurable via `AUDIUS_HOST` env (default `https://audius.co`). Capabilities: search + stream + getTrack + getPlaylist + getPlaylistTracks + getTrendingTracks + getArtistTracks. Track ID format `audius:{hashId}`. Artwork picker prefers 480x480 → 1000x1000 → 150x150. **21 tests**
- [x] **SoundCloud** (`electron/main/sources/soundcloud/`): requires `SOUNDCLOUD_CLIENT_ID` (and optionally `SOUNDCLOUD_CLIENT_SECRET`). Without config: graceful "Configuration missing" status, empty results. Uses `/search/tracks` v2 endpoint. Artwork URL upscaled `-large.jpg` → `-t500x500.jpg`. OAuth scaffolding (token storage) ready for future auth flow. Track ID format `soundcloud:{numericId}`. **25 tests**
- [x] **Integration**: All 4 sources registered in `electron/main/index.ts` via `registerSource()`. Main bundle grew from ~85 kB to ~113 kB.
- [x] **Total tests**: 263/263 pass across 21 test files (was 171 before this phase)

**Known limitations**:

- Deezer: 30-second previews only (legal restriction, no Premium bypass via API)
- SoundCloud: Full OAuth flow not implemented in this phase (token scaffolding only); streaming via public API requires `client_id` from a registered Artist Pro app

**Exit criteria**: 4 new sources integrated, tested, and available alongside existing Local/Demo/Spotify/YouTube Music sources. ✅ MET

---

### Phase 9 — UI Integration ✅

Brought the renderer's UI in sync with the 8 source capabilities. Most of Phase 8's value was previously hidden behind a toggle in Settings.

- [x] **New IPC methods** (`electron/main/ipc/sources.ts`):
  - `sources:user-playlists` → list a source's user playlists (capability-gated, gracefully returns `[]` if not supported)
  - `sources:liked-tracks` → list a source's liked/saved tracks
  - `sources:playlist-tracks` → fetch a playlist's tracks by source id + playlist id
  - `sources:get-config` → read a source's stored settings (used by config UI)
- [x] **Preload bridge** (`electron/preload/index.ts`): added `userPlaylists`, `likedTracks`, `playlistTracks`, `getConfig` to `window.api.sources`
- [x] **Per-source landing view** (`src/features/source/SourceView.tsx`, route `/source/:id`):
  - Source name, id badge, auth indicator, capabilities
  - "Search this source" CTA (deep-links to `/search?source=…`)
  - "Liked Tracks" section (max 50, double-click to play) — shown when `canGetLikedTracks`
  - "Your Playlists" section with per-playlist expandable track lists (max 50/playlist) — shown when `canGetPlaylists`
  - Capability badges, graceful error/disabled states
- [x] **Per-source nav in Sidebar** (`src/components/layout/Sidebar.tsx`): "Sources" sub-section showing all enabled sources with `canSearch || canGetPlaylists || canGetLikedTracks`. Each entry links to `/source/:id`
- [x] **Source indicator on PlayerBar**: colored badge showing the active track's source id (green=Spotify, red=YT Music, blue=Local, etc.)
- [x] **Per-source config UI** (`src/features/settings/SourcePicker.tsx`): ⚙ button on each configurable source opens a dialog to edit credentials. Wired to `sources:get-config` and `sources:save-config`. Supports Spotify, Jamendo, Audius, SoundCloud
- [x] **PlaylistDetailView unresolved info**: now shows which source each unresolved track came from (with source name lookup from registrations)
- [x] **HomeView refresh**: shows enabled source count, "X of Y sources enabled", quick actions grid, and enabled sources list with "Browse →" links for capable sources
- [x] **SearchView query param**: `/search?source=spotify` pre-selects the source. Toggling sources updates the URL
- [x] **Component test infrastructure**:
  - Installed `@testing-library/jest-dom`
  - `tests/setup.ts` now exports `installMockWindowApi(opts)` helper and stubs `Node`/`Element`/etc. on globalThis to work around jsdom 25 + React 18 issues
  - Switched test pool to `forks` for proper React test isolation
  - Added component tests: `tests/unit/sidebar.test.tsx` (6 tests), `tests/unit/sourcePicker.test.tsx` (8 tests), `tests/unit/sourceView.test.tsx` (7 tests)
- [x] **tsconfig.test.json**: expanded `include` to cover all 8 source directories (was missing deezer/jamendo/audius/soundcloud)

**Test count**: 284/284 pass across 24 test files (was 263 before this phase). Typecheck clean, lint clean, build succeeds (renderer bundle 395 → 428 kB).

**Exit criteria**: UI surfaces all 8 sources with proper capability-aware affordances, and per-source landing pages are wired. ✅ MET

---

### Phase 10 — Mini-Player Mode (Near-term)

Compact, always-available player surface for users who want music while working in other apps. The full app stays open in the background; the mini-player is a separate frameless window that floats on top with just the essentials.

**Motivation**: Power users live in their browser/IDE, not in Harmonix. A 360×120 floating window with current track + transport controls removes the need to alt-tab to skip a song or pause.

**Scope**:

- [ ] **Window manager** (`electron/main/windowManager.ts`): new `MiniPlayerWindow` class
  - Separate `BrowserWindow` (frameless, transparent background, `alwaysOnTop: false` by default, `skipTaskbar: true`)
  - Default size 360×120 (resizable vertically up to 400, fixed width)
  - Hide on close (do not destroy) so the user can re-open via tray or shortcut
- [ ] **State sync mechanism** — the audio engine lives in the main renderer, so the mini-player is a **read-only** surface that commands the main renderer via IPC:
  - New IPC: `player:get-state` → returns the current `PlayerState` snapshot (track, position, queue index, isPlaying, volume, source id, artwork)
  - New IPC: `player:command` → `{ action: 'play' | 'pause' | 'toggle' | 'next' | 'prev' | 'seek', payload? }` forwarded to the main renderer
  - Main process pushes state updates to both windows via `webContents.send('player:state-changed', ...)` whenever the main renderer dispatches a player action
  - Both windows render against the same Zustand `playerStore` data (the mini-player just has its own copy that gets hydrated from IPC events)
- [ ] **Mini-player React app** (`src/features/miniPlayer/`):
  - Artwork (60×60, rounded), title (1 line, ellipsis), artist (1 line), source badge (small, same color map as main player)
  - Play/pause, prev, next buttons
  - Thin progress bar (clickable to seek)
  - "Expand to full" button (icon, top-right) → hides mini-player + focuses main window
  - "Close" button → hides mini-player (does not stop playback)
- [ ] **Main renderer integration**:
  - "Minimize to mini-player" button in `PlayerBar` (icon next to volume)
  - Keyboard shortcut `Ctrl/Cmd+Shift+M` → toggle mini-player visibility
  - When mini-player opens, the main window can stay visible or be minimized (user choice in Settings)
- [ ] **System tray** (`electron/main/tray.ts`):
  - Tray icon (use existing `resources/icon.png`)
  - Right-click menu: Show/Hide main, Show/Hide mini-player, Quit
  - Click on tray icon → toggles main window
- [ ] **Window position persistence**:
  - Save x,y on `move`/`resize` (debounced 500ms) to settings DB: `window.miniPlayer.x`, `window.miniPlayer.y`
  - On open, clamp to current display bounds (handle disconnected-monitor case)
- [ ] **Always-on-top toggle**:
  - Right-click on mini-player → context menu with "Always on top" toggle
  - Setting persisted: `window.miniPlayer.alwaysOnTop`
- [ ] **Unit tests**: window state sync reducer (pure function), position clamping logic
- [ ] **E2E test**: `tests/e2e/miniPlayer.spec.ts` — open app, click minimize-to-mini, verify mini-player window appears, click play, verify main window shows playing state
- [ ] **Docs**: update `docs/ARCHITECTURE.md` (new "Mini-Player Window" section), `README.md` (mention in features), this phase entry marked complete

**Considerations**:

- **Audio ownership**: only the main renderer creates the `AudioContext` and `MediaElementSourceNode`. The mini-player must never instantiate one. Documented in code with a `// audio engine lives in main window` comment at the top of `src/lib/audio/engine.ts`.
- **Process overhead**: each BrowserWindow is a separate renderer process (~50–100 MB RSS). The mini-player is opt-in (not opened by default).
- **State staleness**: state-sync is push-based (event-driven), so positions up to ~1s stale are acceptable for a mini-player.
- **CSP & security**: mini-player window loads the same renderer URL as the main window but with a different route (`/mini`). No new CSP relaxation needed.

**Open questions (decide in phase)**:

- Should the mini-player be draggable by the artwork, or only via a title bar region? (Decision: artwork, since the window is frameless)
- macOS-specific: should we use `vibrancy` material? (Decision: yes, with `titleBarStyle: 'hidden'` semantics)

**Exit criteria**: User can toggle the mini-player from the main window, system tray, or keyboard shortcut. Play/pause/prev/next in the mini-player drives the main audio engine. Closing the mini-player does not stop playback. Position persists across restarts. ✅

---

### Phase 11 — AI-Powered Playlist Generation (Long-term)

Generate playlists from natural-language prompts (e.g. _"upbeat jazz for studying, 30 minutes, no vocals, 80% instrumental"_) by combining a pluggable LLM with the existing source-search infrastructure.

**Motivation**: Playlist creation today is manual — search each source, add tracks one by one, repeat. AI generation collapses this to a single prompt + preview, with the same quality as a hand-curated list when the user has 2+ sources enabled.

**Scope**:

- [ ] **Prompt template parser** (`electron/main/ai/promptParser.ts`):
  - Natural language → structured constraints: `{ mood?, genre?, durationMin?, durationMax?, explicit: boolean, instrumental: boolean, sourcePreference: SourceId[], era?: { from?, to? } }`
  - Pure function for testability. Examples:
    - _"chill lo-fi for coding"_ → `{ mood: 'chill', genre: 'lo-fi' }`
    - _"30 min focus jazz, no vocals"_ → `{ durationMax: 30, genre: 'jazz', instrumental: true }`
- [ ] **LLM provider abstraction** (`electron/main/ai/llm/`):
  - `LlmProvider` interface: `complete(prompt: string, schema: ZodSchema): Promise<T>`
  - Implementations:
    - `OpenAiProvider` (gpt-4o-mini or gpt-4.1-nano — cheap + fast for structured output)
    - `AnthropicProvider` (claude-haiku-4-5 — similar cost profile)
    - `OllamaProvider` (local: llama3.1, qwen2.5, mistral — privacy-preserving, no API key)
  - User-configured in Settings (`ai:provider`, `ai:apiKey`, `ai:ollamaHost`)
  - Default: Ollama if reachable, else OpenAI if key set, else disabled with clear "configure AI" CTA
- [ ] **Track suggestion format** (LLM output, validated by Zod):
  ```ts
  type Suggestion = { artist: string; title: string; source?: SourceId; reason?: string };
  type SuggestionList = { suggestions: Suggestion[]; rationale: string };
  ```
- [ ] **Track matcher** (`electron/main/ai/trackMatcher.ts`):
  - For each `Suggestion`: parallel-search the user's enabled sources (in configured priority order) for `"{artist} {title}"`
  - Pick the first hit. If no hit in any source, mark "unresolved" with a reason
  - Return: `{ resolved: Track[]; unresolved: Suggestion[] }`
- [ ] **UI** (`src/features/ai/`):
  - New route `/ai` (sidebar entry) or a modal accessible from the main toolbar
  - Input: multi-line text area with placeholder examples
  - Output: preview list (resolved + unresolved sections) with replace/skip controls
  - "Save as playlist" button → uses existing `playlists:create` + `playlists:add-track` IPCs
- [ ] **Privacy controls**:
  - **Explicit opt-in** for cloud providers (Settings → AI → "Allow cloud AI" toggle, off by default)
  - "Local only" mode is the default; cloud is opt-in
  - **No telemetry** of user listening history is ever sent. Only the prompt text goes to the LLM.
  - Warning UI before the first cloud call: _"This prompt will be sent to {provider}. Your listening history is NOT shared."_
- [ ] **Cost controls**:
  - Cache LLM results by prompt hash (LRU, max 100 entries) — same prompt returns instantly
  - Cap concurrent LLM calls to 1
  - Show token usage + estimated cost in the AI panel footer
- [ ] **Refinement** (stretch goal):
  - Thumbs up/down on each resolved track → stored in `ai_feedback` table
  - Future prompts with same constraints include this feedback in the system prompt
  - Only wired for providers that support system prompts (all three above)
- [ ] **Unit tests**:
  - `promptParser` (≥15 tests covering common phrasings)
  - `trackMatcher` (≥10 tests with mocked source results)
  - LLM response validator (Zod schema, ≥8 tests for malformed inputs)
- [ ] **Integration test**: end-to-end with mock LLM + 2 mock sources (deterministic fixture tracks)
- [ ] **ADR**: new `docs/ADR/0002-llm-provider-default.md` documenting the choice (recommend: Ollama-first, OpenAI as cloud fallback)
- [ ] **Docs**: update `docs/ARCHITECTURE.md` (new "AI Module" section), `docs/SOURCES.md` (mention AI as a meta-source that consumes `MusicSource.search`), `README.md` (new feature entry)

**Considerations**:

- **Hallucination**: LLM may suggest tracks that don't exist or aren't in any source. The `trackMatcher` is the safety net — never trust a suggestion without a real source hit.
- **Latency**: LLM call (1–3s) + parallel source searches (200–800ms total) + dedup = ~2–4s end-to-end. Show a progress UI with the active step.
- **Legal**: this is suggestion + search, not a music recommender model. No scraped data, no ML training. We use the LLM to interpret intent, then defer to each source's own search.
- **Determinism**: same prompt + same enabled sources → same playlist (modulo source-side changes). No personalization in v1.
- **Scope creep**: this phase does NOT include auto-DJ, mood detection, or listening-history-based recommendations. Those are separate future phases (see Backlog).

**Open questions (decide in phase)**:

- Should the AI panel also support "refine this playlist" (apply a delta prompt to an existing list)? — Likely yes, easy to add.
- Should we support multi-language prompts (Indonesian, Spanish, etc.)? — Yes, all three providers handle this; just need to test the parser with non-English inputs.

**Exit criteria**: User can type a natural-language prompt, get a list of playable tracks (resolved from real sources), and save the result as a playlist. Privacy mode (local-only) works without any cloud calls. ✅

---

### Future Phases (Backlog)

See [Section 8](#8-backlog--future-ideas).

---

## 5. Milestones

| Milestone                                                                      | Target            | Status         |
| ------------------------------------------------------------------------------ | ----------------- | -------------- |
| M0: Project scaffolded                                                         | Phase 0 complete  | ✅ Done        |
| M1: Local playback works                                                       | Phase 1 complete  | ✅ Done        |
| M2: Plugin architecture ready                                                  | Phase 2 complete  | ✅ Done        |
| M3: Spotify integration                                                        | Phase 3 complete  | ✅ Done        |
| M4: YouTube Music integration                                                  | Phase 4 complete  | ✅ Done        |
| M5: Playlists & queue                                                          | Phase 5 complete  | ✅ Done        |
| M6: EQ & effects                                                               | Phase 6 complete  | ✅ Done        |
| M7: First public release                                                       | Phase 7 complete  | 🔜 In Progress |
| M8: Additional sources (Deezer/Jamendo/Audius/SoundCloud)                      | Phase 8 complete  | ✅ Done        |
| M9: UI integration (per-source views, sidebar, player source badge, config UI) | Phase 9 complete  | ✅ Done        |
| M10: Mini-player mode (compact floating window + system tray)                  | Phase 10 complete | 🔜 Planned     |
| M11: AI-powered playlist generation (LLM + source search)                      | Phase 11 complete | 🔜 Planned     |

---

## 6. Decision Log

Major decisions are recorded as ADRs in [`docs/ADR/`](ADR/). Current ADRs:

- [ADR-0001: Electron over Tauri](ADR/0001-electron-over-tauri.md)

When making a major decision, create a new ADR file with the next sequential number.

---

## 7. Risk Register

| Risk                              | Impact | Likelihood | Mitigation                                                  |
| --------------------------------- | ------ | ---------- | ----------------------------------------------------------- |
| YouTube/yt-dlp breaks             | High   | Medium     | Pin version, auto-update mechanism, isolate in adapter      |
| Spotify revokes app               | High   | Low        | OAuth scopes minimal, document re-application process       |
| EQ doesn't work on Spotify        | Medium | Certain    | Documented limitation in UI tooltip                         |
| Cross-platform yt-dlp binary size | Low    | Medium     | Optional download on first launch instead of bundling       |
| Solo dev burnout                  | High   | Medium     | Phases are independent; each ends with a usable app         |
| Future team handoff               | High   | Low        | Heavy docs, plugin architecture, ADRs, Conventional Commits |

---

## 8. Backlog & Future Ideas

### Near-term (post-MVP)

- [ ] Lyrics display (LRClib or Musixmatch)
- [ ] Last.fm scrobbling
- [ ] Discord Rich Presence
- [ ] Global hotkeys
- [ ] Keyboard shortcuts customization

### Long-term

- [ ] Cloud sync of playlists and preferences
- [ ] Mobile companion app (read-only)
- [ ] Web version (PWA)
- [x] ~~Additional sources: Deezer, Jamendo, Audius, SoundCloud~~ (shipped in Phase 8)
- [x] ~~Mini-player mode~~ (planned as Phase 10)
- [x] ~~AI-powered playlist generation~~ (planned as Phase 11)
- [ ] Podcast RSS source
- [ ] Collaborative playlists
- [ ] Social features
- [ ] Auto-DJ / listening-history-based recommendations
- [ ] Voice control / assistant integration

---

## 9. How to Resume This Project

If you're picking up this project after a break (or you're a new contributor):

1. **Read this document** (you're doing it! ✅).
2. **Read [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)** to understand the system design.
3. **Read [`docs/SOURCES.md`](SOURCES.md)** to understand how source adapters work.
4. **Check the [Milestones table](#5-milestones)** to see where we are.
5. **Check [`CHANGELOG.md`](../CHANGELOG.md)** for recent changes.
6. **Look at the [GitHub Issues](../../issues)** for open tasks.
7. **Read [`docs/CONTRIBUTING.md`](CONTRIBUTING.md)** for workflow.

### Quick Status Check

```bash
# What phase are we in?
cat docs/PLANNING.md | grep "Phase.*—"

# What's the latest release?
cat CHANGELOG.md | head -20

# Are there open issues?
gh issue list --state open
```

---

**Last updated**: Planning expanded with Phase 10 (Mini-Player Mode, near-term) and Phase 11 (AI-Powered Playlist Generation, long-term)
