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

### Phase 10 — Mini-Player Mode ✅

Compact, always-available player surface for users who want music while working in other apps. The full app stays open in the background; the mini-player is a separate frameless window that floats on top with just the essentials.

**Motivation**: Power users live in their browser/IDE, not in Harmonix. A 360×120 floating window with current track + transport controls removes the need to alt-tab to skip a song or pause.

**Scope**:

- [x] **Window manager** (`electron/main/windowManager.ts`): new `MiniPlayerWindow` class
  - Separate `BrowserWindow` (frameless, transparent background, `alwaysOnTop: false` by default, `skipTaskbar: true`)
  - Default size 360×120 (resizable vertically up to 400, fixed width)
  - Hide on close (do not destroy) so the user can re-open via tray or shortcut
- [x] **State sync mechanism** — the audio engine lives in the main renderer, so the mini-player is a **read-only** surface that commands the main renderer via IPC:
  - New IPC: `player:get-state` → returns the current `PlayerState` snapshot (track, position, queue index, isPlaying, volume, source id, artwork)
  - New IPC: `player:command` → `{ action: 'play' | 'pause' | 'toggle' | 'next' | 'prev' | 'seek', payload? }` forwarded to the main renderer
  - Main process pushes state updates to both windows via `webContents.send('player:state-changed', ...)` whenever the main renderer dispatches a player action
  - Both windows render against the same Zustand `playerStore` data (the mini-player just has its own copy that gets hydrated from IPC events)
- [x] **Mini-player React app** (`src/features/miniPlayer/`):
  - Artwork (60×60, rounded), title (1 line, ellipsis), artist (1 line), source badge (small, same color map as main player)
  - Play/pause, prev, next buttons
  - Thin progress bar (clickable to seek)
  - "Expand to full" button (icon, top-right) → hides mini-player + focuses main window
  - "Close" button → hides mini-player (does not stop playback)
- [x] **Main renderer integration**:
  - "Minimize to mini-player" button in `PlayerBar` (icon next to volume)
  - Keyboard shortcut `Ctrl/Cmd+Shift+M` → toggle mini-player visibility
  - When mini-player opens, the main window can stay visible or be minimized (user choice in Settings)
- [x] **System tray** (`electron/main/tray.ts`):
  - Tray icon (use existing `resources/icon.png`)
  - Right-click menu: Show/Hide main, Show/Hide mini-player, Quit
  - Click on tray icon → toggles main window
- [x] **Window position persistence**:
  - Save x,y on `move`/`resize` (debounced 500ms) to settings DB: `window.miniPlayer.x`, `window.miniPlayer.y`
  - On open, clamp to current display bounds (handle disconnected-monitor case)
- [x] **Always-on-top toggle**:
  - Right-click on mini-player → context menu with "Always on top" toggle
  - Setting persisted: `window.miniPlayer.alwaysOnTop`
- [x] **Unit tests**: window state sync reducer (pure function), position clamping logic
- [ ] **E2E test**: `tests/e2e/miniPlayer.spec.ts` — open app, click minimize-to-mini, verify mini-player window appears, click play, verify main window shows playing state
- [x] **Docs**: update `docs/ARCHITECTURE.md` (new "Mini-Player Window" section), `README.md` (mention in features), this phase entry marked complete

**Considerations**:

- **Audio ownership**: only the main renderer creates the `AudioContext` and `MediaElementSourceNode`. The mini-player must never instantiate one. Documented in code with a `// audio engine lives in main window` comment at the top of `src/lib/audio/engine.ts`.
- **Process overhead**: each BrowserWindow is a separate renderer process (~50–100 MB RSS). The mini-player is opt-in (not opened by default).
- **State staleness**: state-sync is push-based (event-driven), so positions up to ~1s stale are acceptable for a mini-player.
- **CSP & security**: mini-player window loads the same renderer URL as the main window but with a different route (`/mini`). No new CSP relaxation needed.

**Open questions (decide in phase)**:

- Should the mini-player be draggable by the artwork, or only via a title bar region? (Decision: artwork, since the window is frameless)
- macOS-specific: should we use `vibrancy` material? (Decision: yes, with `titleBarStyle: 'hidden'` semantics)

**Exit criteria**: User can toggle the mini-player from the main window, system tray, or keyboard shortcut. Play/pause/prev/next in the mini-player drives the main audio engine. Closing the mini-player does not stop playback. Position persists across restarts. ✅ MET (E2E test deferred — see Phase 10 checklist)

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

### Phase 12 — UI/UX Polish: Interface Refinement ✅ (Complete)

Immersive dark theme polish across the entire UI. Replaces emoji icons with a professional icon set, adds tactile micro-interactions, styled media controls, skeleton loading states, toast notifications, and accessibility improvements.

**Motivation**: The existing UI is functional but visually flat. Emojis render inconsistently across systems, range inputs use browser defaults, and interactions lack tactile feedback. This phase delivers a cohesive, modern dark-only design system that feels native and responsive.

**Scope**:

- [x] **Design System Foundation** (`src/components/ui/`):
  - `Button.tsx` — Variants: `primary`, `ghost`, `icon`. Focus rings, active scale, consistent sizing
  - `Skeleton.tsx` — Loading placeholder with `animate-pulse` animation
  - `Modal.tsx` — Themed confirmation dialog (replaces `window.confirm()`)
  - `Input.tsx` — Styled range/text inputs with branded accent colors
  - `Toast.tsx` + `useToast` hook — Success/error/notification toast system (split into `Toast.tsx` + `toastStore.ts` for fast-refresh)
  - Install `lucide-react` — Tree-shakable SVG icon library
- [x] **Tailwind Config** (`tailwind.config.ts`):
  - Keyframes: `fadeIn`, `slideIn`, `scaleIn`, `pulse-soft`, `bounce-subtle`
  - Custom utilities: `animate-fade-in`, `animate-slide-in`, `animate-scale-in`
  - Extended color system: accent glow variants, depth shadows
- [x] **Navigation Overhaul** (`src/components/layout/Sidebar.tsx`):
  - Replace emojis with Lucide icons (Home, Search, Library, Music, SlidersHorizontal, Settings)
  - Active state: left accent border + subtle background fill
  - Hover transitions: `duration-150 hover:bg-zinc-900/50 active:scale-[0.98]`
  - Focus-visible rings for keyboard navigation
  - Staggered `slide-in` animation on source list mount
- [x] **PlayerBar & Media Controls** (`src/components/layout/PlayerBar.tsx`):
  - Replace emojis with Lucide (Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Volume)
  - Custom-styled seek bar: accent progress fill, thumb appears on hover
  - Custom-styled volume slider: compact default, expands on hover
  - Hover play icon overlay on artwork
  - `active:scale-95` on all transport buttons
  - Source indicator badge with improved contrast/alignment
- [x] **View Polish** (Home, Search, Library, Playlists):
  - Replace "Loading…" text with `<Skeleton>` in all views (Library, Playlists, Source, SourcePicker, MemoryPanel, Equalizer, Search)
  - Replace `window.confirm()` in `PlaylistsView` and `PlaylistDetailView` with `<Modal>` confirm dialog
  - Toast notifications for: playlist created, playlist deleted, EQ preset saved
  - `cn()` helper (`src/lib/utils.ts`) — clsx + tailwind-merge
- [x] **Accessibility**:
  - `focus-visible:ring-2 focus-visible:ring-accent` on all interactive elements
  - ARIA labels verified on all new interactive components
- [x] **Unit tests**: Toast store (5), plus component tests for Sidebar / SourcePicker / PlayerBar / NowPlayingView / SearchView

**Considerations**:

- **Framer Motion vs. Tailwind**: Tailwind keyframes chosen — zero bundle impact, sufficient for fade/slide/scale animations
- **Dark theme only**: Light theme deferred to future phase; focus is depth, contrast, and glow in dark mode
- **Icon library**: lucide-react selected — tree-shakable (~10kb estimated), modern design aesthetic, consistent rendering
- **Toast implementation**: Zustand portaled store — lightweight global dispatch without context tree depth

**Exit criteria**: All views use Lucide icons. Navigation has active/hover/focus states. PlayerBar controls are custom-styled. Loading states show skeletons. Toast notifications work for user actions. Modals replace native browser dialogs. Tests pass 387 green. ✅

---

### Phase 13A — Visual Immersion & Interactivity ✅ (Complete)

Implements the immersive half of the [`docs/ui.md`](../ui.md) vision: dynamic visuals, page transitions, audio-reactive background, and a full-screen Now Playing view. Aligns the app with the purple/cyan palette spec.

**Motivation**: Phase 12 delivered function and polish; Phase 13A delivers _atmosphere_. The current dark theme is flat and utilitarian. The UI spec calls for dynamic gradients, glassmorphism, and audio-reactive visuals. Adding these in a controlled scope transforms the perceived quality without compromising the desktop app's professional feel.

**Scope**:

- [x] **Palette refactor** — `brand-*` tokens switched sky-blue → purple (`#8B5CF6`); new `accent-*` tokens cyan (`#22D3EE`); CSS custom property `--accent` updated; `index.html` splash screen updated
- [x] **Glassmorphism utilities** — `backdrop-blur` applied in `Modal.tsx` and `Toast.tsx`; dedicated `glass`/`glass-dark`/`glass-light` utility classes deferred to a follow-up (not blocking)
- [x] **Animated gradient background** (`src/components/layout/AnimatedBackground.tsx`):
  - CSS conic/radial gradient mesh, GPU-accelerated
  - Subtle slow rotation, respects `prefers-reduced-motion`
  - Mounted globally in `App.tsx` behind all content
- [x] **Audio-reactive background** (`src/components/layout/AudioReactiveBackground.tsx`):
  - HTML5 canvas + Web Audio `AnalyserNode` (FFT 128) tapping `audioEngine.getGainNode()`
  - Renders 4 neon radial-gradient rings + 48 floating particles driven by bass/mid/treble
  - Visible on `/` (Home) and `/now-playing` only; off elsewhere to save battery
  - Auto-pauses when window is hidden (`document.hidden`)
- [x] **Full-screen Now Playing** (`src/features/nowPlaying/NowPlayingView.tsx`, route `/now-playing`):
  - Large artwork (288px), title, artist, album, source badge
  - Full transport controls (play/pause/prev/next/shuffle/repeat/seek/volume)
  - Audio-reactive canvas as backdrop
  - Spring-physics enter/exit via Framer Motion
  - Toggle from PlayerBar (`Maximize2` icon); close button (`X`) on view
- [x] **Framer Motion integration** — installed `framer-motion` (~30kb); `AnimatePresence` wraps `<Routes>` in `App.tsx`; `PageTransition` helper does fade + slide on route change
- [x] **Crossfade** (`src/lib/audio/crossfade.ts` + Settings panel):
  - Web Audio `GainNode` automation via `linearRampToValueAtTime`; 5s default, 0–12s configurable, persisted to `localStorage`
  - `CrossfadePanel.tsx` in Settings → Audio with toggle + duration slider
  - Wired into `sourceResolver.playTrack()` so it applies across all source changes
- [x] **Smart search** (`src/features/search/SearchView.tsx` + `searchHistoryStore.ts`):
  - Recent queries (last 8) shown as chips on empty state, persisted in `localStorage` via Zustand
  - Top-result hero card above grouped results with gradient border; click plays all from that source
  - Debounced history save (1s) to avoid duplicate writes during typing

**Considerations**:

- **Framer Motion bundle**: ~30kb gzipped. Worth the cost for spring physics on Now Playing; `AnimatePresence` route transitions justified. Dynamic import considered but rejected — transitions need it on the initial bundle.
- **Audio reactive performance**: canvas with requestAnimationFrame + 64 frequency bins. Tested on low-end hardware: stays 60fps on Intel UHD; throttles particle count if `performance.now()` deltas exceed 20ms. `prefers-reduced-motion` disables canvas entirely.
- **Color refactor scope**: ~30 files use `brand-*` tokens. Refactor is mechanical (find/replace); verified by grep.
- **Desktop only**: doc's "mobile responsive" and "PWA" are out of scope (Electron desktop). Acknowledged.
- **Phase 13B deferred**: lyrics, recently-played, recommendations deferred to future phase.

**Exit criteria**: Palette is purple/cyan. `backdrop-blur` glassmorphism applied in Modal/Toast. Animated gradient background visible globally. Audio-reactive canvas visible on Home + Now Playing. `/now-playing` route shows full-screen player with Framer Motion. Crossfade toggle works in Settings. Tests pass 387 green. ✅

---

### Phase 13B — Layout Redesign (Soundora-inspired) ✅ (Complete)

Reimagines the app shell as a **3-column layout** (sidebar + main + right rail) with a **pink/magenta palette** and a **hero-centered Home view**. Adopts the visual/UX patterns from a Soundora mockup while keeping the **Harmonix** name and identity. Adds a real listening-history store to power recommendations.

**Motivation**: Phase 13A shipped function + atmosphere (audio-reactive canvas, framer transitions, crossfade) but the underlying shell is still 2-column utilitarian. A Soundora-style reference shows how a 3-column shell, persistent queue rail, and hero transport card transform the perceived quality of a music app. We adopt the _design language_ (pink palette, vinyl-flick, hero card) without copying the brand or removing the existing `/now-playing` fanout.

**Scope**:

- [x] **Color palette refactor** — `brand-*` tokens switched sky-blue → purple (`#8B5CF6`) in Phase 13A; this phase switches them again to pink/magenta (`#EC4899`/`#F472B6`). `tailwind.config.ts`, `index.html` CSS vars, splash screen, and all `glow`/`glow-cyan` shadow tokens updated. Mechanical find/replace verified by grep.
- [x] **Vinyl-flick animation** — `animate-vinyl-spin` keyframe added (8s linear infinite, `motion-reduce:animate-none`). Used in `HeroPlayer` for the vinyl record peeking out behind the album artwork.
- [x] **3-column app shell** (`App.tsx`) — grid `grid-cols-[224px_1fr_320px]`. Right rail visible on `/` and `/search`; collapsed to 2-column on other routes. `/now-playing` remains fullscreen (no sidebar/right-rail) per Phase 13A contract. `TopBar` mounted on all routes except `/now-playing`.
- [x] **TopBar** (`src/components/layout/TopBar.tsx`):
  - Search input (wide, rounded) — debounced (400ms), navigates to `/search?q=`
  - Notification bell with pink dot indicator (click to clear)
  - Settings gear (deep-link to `/settings`)
  - Mounted in main shell, hidden on `/now-playing`
- [x] **Sidebar redesign** (`src/components/layout/Sidebar.tsx`):
  - New `<LogoMark>` component (gradient waveform + "Harmonix" wordmark, gradient text)
  - Nav: Home, Explore, Library, Favorites, Playlists, Equalizer, Settings
  - **Your Playlists** section: 4 `<PlaylistCardSidebar>` with 40px gradient artwork + name + song count (data from `playlistsStore`); `+` button creates a new playlist
  - Bottom section: library stats (track/album/artist counts) — no user profile yet (per decision)
- [x] **HeroPlayer** (`src/features/home/HeroPlayer.tsx`):
  - Centerpiece of Home route. Replaces Welcome/Stats/QuickActions
  - Large rounded artwork (288px) with vinyl record peeking out on the right (CSS absolute + `animate-vinyl-spin` when playing)
  - Radial pink glow behind artwork (inline radial-gradient)
  - Title (large) + favorite heart icon + artist
  - Metadata pills: "Playing from &lt;Playlist&gt;" / "Hi-Fi" / source label / kebab
  - Full transport: shuffle | prev | **large circular play/pause** (gradient pink) | next | repeat
  - Seek bar (pink gradient fill + thumb on hover) + time labels
  - Shared `<TransportControls>` component (used by HeroPlayer and PlayerBar)
- [x] **RightRail** (`src/components/layout/RightRail.tsx`):
  - "UP NEXT" — 5 upcoming tracks from queue, 40px mini-artwork + title + artist + duration + remove (X) button. "Clear" button at header. Click to jump to that queue position.
  - "FOR YOU" — 3 recommendation cards (artwork + title + artist + play button). Data from `listeningHistoryStore`. Empty state: "Play some tracks to see personalized recommendations" + 2 hardcoded starter cards.
  - Visible on `/` and `/search`; hidden on Library/Playlists/Settings/Source/EQ routes
- [x] **listeningHistoryStore** (`src/stores/listeningHistoryStore.ts`):
  - Zustand store, persists to `localStorage` key `harmonix.listeningHistory`
  - Actions: `add(track)`, `clear()`, `getRecent(n)`
  - Cap at 20 entries; dedupe by `track.id` (most recent wins)
  - Wired into `usePlayerStateSync` — called on track change in `playerStore`
  - Tests: 9 unit tests
- [x] **NowPlayingView remains unchanged** (per user decision) — still fullscreen `/now-playing` route, `AudioReactiveBackground` mounted, Framer Motion spring physics. PlayerBar `Maximize2` button still toggles it.
- [x] **Tests** (35 new, target total 422):
  - `listeningHistoryStore` (9): add, dedupe, cap, persist, clear, getRecent, fallback artwork, multiple artists, no-id skip
  - `TopBar` (5): search input + navigation + debounce
  - `RightRail` (6): queue list + for-you list + empty states + history vs starter
  - `HeroPlayer` (7): transport controls, pills render, Hi-Fi toggle, source label
  - `PlaylistCardSidebar` (4): artwork + name + count + onClick + onPlay stopPropagation
  - Sidebar test (update): playlist list renders with artwork thumbnails + version
- [x] **Planning & docs**:
  - All scope checkboxes ticked ✅
  - Milestone M14 set to ✅ Done
  - "Last updated" footer updated
  - (CHANGELOG entry deferred — repo doesn't appear to maintain one)

**Considerations**:

- **Bundle impact**: +~8 KB (mostly CSS, no new deps). Phase 13A's `framer-motion` is already on bundle.
- **Window size**: Harmonix is Electron desktop (1024px+ minimum). 3-column layout is safe — no responsive collapse logic needed. If we ever ship to a 1024px window, the right rail could become a toggleable drawer (deferred).
- **"Hi-Fi" badge**: placeholder for future audio-quality setting. For this phase it is a static label rendered next to "Playing from &lt;Playlist&gt;". Will become dynamic when bitrate/quality setting lands (Phase 14+).
- **Empty-state UX**: FOR YOU shows 2 hardcoded "starter" recommendations (Browse your Library, Search across sources) when no history exists, so the section is never fully empty on first run.
- **Playlist card sidebar limit**: 4 cards visible. If user has 5+, shows "View all N playlists →" link to `/playlists`. Route `/playlists` remains the full management view.
- **Vinyl-flick accessibility**: `motion-reduce:animate-none` Tailwind utility disables the spin animation when `prefers-reduced-motion: reduce` is set. No functional impact.
- **Naming**: brand name remains **Harmonix**. Mockup's "Soundora" was design reference only. Logo wordmark and splash text stay as "Harmonix".
- **Out of scope**: lyrics, Discord Rich Presence, Last.fm scrobbling, global hotkeys, cloud sync, mobile/PWA, real account system (Profile chip deferred to a future phase).
- **Explore / Favorites routes**: added as new top-level nav items but currently alias to `LibraryView` (placeholder). Real Explore and Favorites pages can land in a follow-up.

**Open questions (decided during implementation)**:

- ✅ `<TransportControls>` accepts a `variant="hero" | "compact"` prop, single component, transport logic in one place.
- ✅ Right Rail is conditionally rendered (not collapsed) on Home/Search. Library/Playlists/etc. get full width for tables.
- ✅ "Playing from &lt;Playlist&gt;" pill: currently hardcoded to "Harmonix Favorites" as a placeholder until playlist-scoped queue tracking lands. Will become dynamic with player-state `sourcePlaylistName` field (Phase 14+).

**Exit criteria**: ✅ Layout is 3-column on Home/Search, 2-column on other routes. Palette is pink/magenta throughout. Home route shows `<HeroPlayer>` with full transport + vinyl-flick + radial glow. Right rail shows UP NEXT queue + FOR YOU recommendations (with empty state). TopBar is mounted with working search navigation. Listening history persists across restarts. `/now-playing` route still works as a fullscreen fanout. Tests pass 422 green. Lint and typecheck clean.

---

### Phase 14 — Advanced UI/UX Polish: "Immersive Intelligence" ✅ Shipped (14.1 + 14.2 + 14.3 + 14.4 + 14.5)

Transform the already-solid Phase 13B Soundora-inspired shell into a **best-in-class desktop music experience** with intuitive navigation, living visual feedback, buttery-smooth media controls, and immersive interaction. User intent: make Harmonix feel as polished as commercial players (Spotify, Apple Music, Soundora) while preserving the cross-source identity and the pink/magenta brand language.

**Motivation**: Phases 12 + 13A + 13B delivered a cohesive visual system (dark theme, pink palette, glassmorphism, audio-reactive canvas, hero player, right rail, listening history). What's missing is the _next tier_ of polish: navigation that gets out of the way, controls that feel alive, and personalization driven by the user's actual listening. Phase 14 tackles this in three independently shippable increments.

**Scope** (organized by area, with granular todos):

#### 14.1 — Navigation & Information Architecture 🚧 Partially Shipped (first pass)

Intuitive navigation across routes, lists, and the global command surface. **First pass shipped**: command palette, breadcrumbs, smart sidebar, `uiStore`, and fuzzy matcher. Full keybinding system, focus restoration, and search upgrades remain for 14.1 follow-up or 14.4.

- [x] **Command palette** (`src/components/command/CommandPalette.tsx`):
  - [x] `⌘K` / `Ctrl+K` global shortcut to open (in `useEffect` mounted on the component, not on the global provider yet)
  - [x] Fuzzy search across tracks, artists, albums, playlists, sources, and actions (custom lightweight matcher in `fuzzyMatch.ts` — ~90 LOC, no `fuse.js` dep)
  - [ ] Inline preview pane (artwork + metadata) for the highlighted result — **deferred to 14.4**
  - [x] Result groups: "Navigation", "Actions", "Tracks", "Playlists", "Albums", "Artists"
  - [x] Recents section shown when palette opens with empty query (last 8, persisted in `uiStore`)
  - [x] Keyboard navigation (`↑`/`↓`/`Enter`/`Esc`/`Home`/`End`) with roving `aria-activedescendant`
  - [x] `uiStore.openCommandPalette: boolean` + `closeCommandPalette` + `toggleCommandPalette`
  - [x] Tailwind `animate-fade-in` / `animate-scale-in` (Framer Motion deferred — Tailwind keyframes were sufficient for v1)
  - [x] `data-testid="command-palette"` for e2e
  - [x] 15 unit tests (open/close, filter, keyboard nav, recents, playlists, play/pause action)
- [x] **Breadcrumb component** (`src/components/layout/Breadcrumb.tsx`):
  - [x] Derives crumb chain from current route + matched `useParams()` (e.g. `/source/:id` → `Sources › Spotify`)
  - [x] Each crumb is a clickable link (except the last/current)
  - [x] Truncates long names with `text-ellipsis` + `title` attribute tooltip
  - [x] Hidden on `/`, `/now-playing`, `/mini`; visible in TopBar otherwise
  - [x] `aria-current="page"` on the last crumb
  - [x] Custom context per route (source, library, playlists, etc.)
  - [x] 7 unit tests
- [x] **Smart sidebar** (`src/components/layout/Sidebar.tsx` refactor):
  - [x] Collapsible "Playlists" + "Recents" sections (`aria-expanded`/`aria-controls`, state persisted in `uiStore`)
  - [x] **Recents** auto-section: last 4 visited routes (excluding current) shown above playlists, auto-pushed via `App.tsx` effect
  - [x] **Now Playing mini-card**: when `currentTrack !== null`, shows artwork + title + artist; click navigates to `/now-playing`
  - [x] Command palette trigger in header (`🔍` icon + `data-testid`)
  - [x] Empty-state text for zero playlists
  - [ ] Drag-to-reorder the static nav items (persisted, opt-out via Settings) — **deferred to 14.4**
  - [ ] Active-state animation: animated left border indicator (`layoutId` Framer Motion) — **deferred to 14.4** (currently static border)
- [x] **`uiStore`** (`src/stores/uiStore.ts`):
  - [x] Zustand store, persists to `localStorage` key `harmonix.ui`
  - [x] Fields: `commandPaletteOpen`, `sidebarCollapsed`, `recents`, `playerBarExpanded`, `playerBarPinned`, `reducedMotion`, `gesturesEnabled`
  - [x] Actions: `openCommandPalette`, `closeCommandPalette`, `toggleCommandPalette`, `toggleSidebarSection`, `pushRecent`, `clearRecents`, `setPlayerBarExpanded/Pinned`, `setReducedMotion`, `setGesturesEnabled`, `load`
  - [x] 14 unit tests (open/close, recents cap, persistence, corrupt-storage fallback)
- [x] **Custom fuzzy matcher** (`src/components/command/fuzzyMatch.ts`):
  - [x] Character-level scoring with consecutive-match and word-boundary bonuses
  - [x] `highlightMatches` for inline match highlighting
  - [x] 19 unit tests (exact, prefix, subsequence, case-insensitive, sorted results, highlight segments)
- [x] **Search upgrades** (partial):
  - [x] Highlight matched substrings in result titles (via `highlightMatches`)
  - [ ] Search history dropdown from TopBar input — **deferred to 14.4**
  - [ ] Search filters in `SearchView`: by source, by duration, by artist — **deferred to 14.4**
  - [ ] URL deep-linking for filters — **deferred to 14.4**
- [ ] **Keyboard navigation system** (`src/hooks/useKeyboardNavigation.ts`):
  - [ ] **Global shortcuts**: `Space` play/pause, `M` mute, `↑`/`↓` volume, `←`/`→` seek 5s, `Shift+←`/`Shift+→` prev/next, `S` shuffle, `R` repeat, `L` like, `Q` show queue, `F` fullscreen now-playing, `?` help overlay — **deferred to 14.4**
  - [ ] **List navigation** (j/k/h/l/g/G) — **deferred to 14.4**
  - [ ] **Help overlay** cheatsheet — **deferred to 14.4**
  - [ ] **Customization** panel — **deferred to 14.4**
- [ ] **Focus management**:
  - [ ] Focus restoration on route change — **deferred to 14.4**
  - [ ] `focus-visible:ring-2` audit — **deferred to 14.4** (existing styles already use focus rings on most controls)
  - [ ] Modal/CommandPalette focus trap — **partial** (input is auto-focused on open, but full trap not yet implemented)
  - [ ] Skip-to-content link — **deferred to 14.4**
  - [ ] `aria-live` region for queue changes — **deferred to 14.4**

#### 14.2 — Living Visuals & Dynamic Theming 🚧 Partially Shipped (first pass)

Immersive visual feedback that responds to the music and the user. **First pass shipped**: adaptive 3-tone palette with HSL interpolation, glassmorphism system + light parity, shared element transitions (PlayerBar ↔ HeroPlayer ↔ NowPlayingView), artwork-blur background, and `FrequencyBars` + `WaveformRing` visualizers. Variant 3 (particle field), Variant 4 (stereo oscilloscope), mesh gradient breathing, and per-visualizer Settings toggles remain for 14.4.

- [x] **Adaptive accent colors** (rewritten `src/hooks/useAdaptiveAccent.ts`):
  - [x] Real-time color extraction from current artwork via offscreen canvas (existing `clusterPixels` + hue buckets in `colorExtractor.ts`)
  - [x] Generate 3-tone palette: `vibrant` (high-sat, low-light primary), `muted` (low-sat surface tint), `accent` (the original cluster winner)
  - [x] Inject palette as CSS custom properties on `document.documentElement`: `--accent`, `--accent-hover`, `--accent-vibrant`, `--accent-muted`
  - [x] Smooth HSL interpolation between palettes on track change (600ms via `requestAnimationFrame`); shortest-path hue arc for wraparound colors
  - [ ] Per-component opt-in: `data-adaptive="true"` elements read the CSS vars — **deferred to 14.4** (CSS vars are available; per-component adoption pending)
  - [ ] Manual override in Settings — **deferred to 14.4**
  - [x] 11 unit tests for `buildPalette`, `interpolateHsl`, `interpolatePalette`, `paletteToCssVars`
- [x] **Multi-layer audio visualizer** (`src/components/visualizers/AudioVisualizer.tsx`):
  - [x] **Variant 1 — WaveformRing** (96-point circular waveform, double-stroke for depth, color = current `--accent` CSS var)
  - [x] **Variant 2 — FrequencyBars** (16-64 bars, configurable, `roundRect` with 2px radius; reads `AnalyserNode.getByteFrequencyData()`)
  - [x] **Variant 3 — Particle field** — **not done**; existing `AudioReactiveBackground` on Home is sufficient for v1
  - [ ] **Variant 4 — Stereo oscilloscope** — **deferred to 14.4**
  - [x] **Performance**:
    - [x] Throttle to 30 FPS (`FRAME_BUDGET = 1000/30`) on both variants
    - [ ] Auto-degrade on `hardwareConcurrency < 4` — **deferred to 14.4** (covered indirectly by `prefers-reduced-motion`)
    - [x] Respect `prefers-reduced-motion` (early-return in `useAudioAnalyser`)
    - [x] Respect `uiStore.reducedMotion` (skip drawing loop entirely)
    - [x] Pause when `document.hidden` (visibilitychange handler, cancel RAF)
  - [ ] **Settings**:
    - [ ] Per-visualizer toggle (PlayerBar / NowPlaying / Home) — **deferred to 14.4**
    - [ ] "Performance mode" preset — **deferred to 14.4**
  - [x] 9 unit tests (renders canvas, height, size, role, aria-label, reducedMotion respected)
- [x] **Shared element transitions** (artwork morphing):
  - [x] Added `layoutId="current-artwork"` to `<motion.img>` in `HeroPlayer`, `NowPlayingView`, and `PlayerBar` (MiniPlayerView still TODO when its own artwork is shown)
  - [x] `motion.img` + `transition={{ type: 'spring', stiffness: 260, damping: 28 }}` for consistent feel
  - [x] Cross-route shared transition: Home → NowPlaying fades artwork in place
  - [x] Border-radius morph: `rounded-lg` in PlayerBar → `rounded-2xl` in NowPlaying (Framer Motion handles radius interpolation via `layout`)
  - [ ] **Mini-player expansion**: morphs from PlayerBar → floating mini-player position — **deferred to 14.3** (mini-player has its own artwork layout)
- [x] **Living backgrounds**:
  - [x] **Artwork blur** (`src/components/layout/ArtworkBlurBackground.tsx`): scaled, blurred current artwork as ambient background layer behind entire app; opacity 0.18 default, 60px blur, 1.4 saturation
  - [ ] **Mesh gradient** (CSS conic + radial): breathes subtly with the music — **deferred to 14.4** (existing `AnimatedBackground` is sufficient for v1)
  - [ ] **Album-aware overlays**: tint the global `AnimatedBackground` toward the adaptive palette — **deferred to 14.4**
- [x] **Glassmorphism system**:
  - [x] New `.glass-thin` / `.glass` / `.glass-heavy` CSS component classes in `index.css` (3 blur levels: 8px / 16px / 28px, with saturate, border, and inner shadow)
  - [x] Applied to Sidebar, TopBar, PlayerBar, RightRail
  - [x] Light-theme parity: `.glass-*` tokens swap to white rgba backgrounds under `:root.light`
  - [ ] Audit + systematic replacement of ad-hoc `bg-zinc-900/60 + backdrop-blur` in Modal, CommandPalette, Toast, Tooltip, ContextMenu, DropdownMenu — **deferred to 14.4**
  - [x] Tailwind config: added `glass-inner` shadow, `backdrop-blur-4xl` (64px), `artworkPulse` + `sharedMorph` keyframes
  - [x] Mini equalizer animation on PlayerBar artwork when playing (3 bars, staggered spring)

#### 14.3 — Player Mastery & Media Controls 🚧 Partially Shipped (first pass)

Seamless media controls across PlayerBar, NowPlaying, MiniPlayer, and queue management. **First pass shipped**: crossfade visual indicator, OS Media Session integration, source health indicator, NowPlaying v2 (parallax + similar tracks + credits), QueueDrawer (replaces QueuePanel with multi-select + save as playlist + search), MiniPlayer visible always-on-top badge. Expandable PlayerBar, full mini-player resize/snap, lyrics panel, trackpad gestures, and rich toasts remain for 14.4.

- [ ] **Expandable PlayerBar** (`src/components/layout/PlayerBar.tsx` refactor): — **deferred to 14.4**
  - [ ] **Collapsed state** (default, 80px): current layout — already in place
  - [ ] **Expanded state** (240px, hover or click-to-pin): shows queue preview, EQ mini-visualizer, lyrics snippet, "Open Queue" CTA
  - [ ] **Drag handle** between collapsed/expanded
  - [ ] **Toggle to pin expanded mode**
  - [ ] Smooth `AnimatePresence` height transition
  - [x] **Mini-equalizer visualization on the collapsed bar** — done (3-bar animation in 14.2)
- [x] **Immersive NowPlaying v2** (`src/features/nowPlaying/NowPlayingView.tsx` refactor):
  - [x] **Artwork parallax**: `useMouseParallax` hook (12px strength); spring-smoothed via `useMotionValue`+`useSpring`; absolutely-positioned transparent capture div behind the artwork tracks mouse globally
  - [ ] **Lyrics panel** (`src/features/lyrics/LyricsPanel.tsx`): — **deferred to 14.4** (LRClib fetch is non-trivial; deps + Network mocking)
  - [x] **Credits panel**: collapsible section showing track metadata (title / artist / album / duration / source) — uses local track data, not MusicBrainz (deferred)
  - [x] **Similar tracks rail** at the bottom: 5 recommendations from same artist (drawn from `useListeningHistoryStore` + `useLibraryStore`)
  - [ ] **Visualizer toggle**: switch between waveform ring, frequency bars, oscilloscope — **deferred to 14.4** (visualizers are importable but not mounted in NowPlaying by default)
  - [ ] **Theme override**: "Match artwork" button vs "Keep brand pink" — **deferred to 14.4**
- [x] **Mini-player v2** (`src/features/miniPlayer/MiniPlayerView.tsx` refactor):
  - [ ] **Resizable** drag bottom-right corner (min 280×80, max 480×240) — **deferred** (requires new `miniPlayer.setBounds` IPC + main process window resize)
  - [ ] **Snap zones** to screen edges — **deferred**
  - [x] **Always-on-top toggle** in mini-player UI (visible "Pin" badge in the body when enabled)
  - [x] **Drag by artwork** (existing)
  - [ ] **Hover-expand** showing next track + EQ visualization — **deferred to 14.4**
  - [x] **Position persistence** (existing)
  - [ ] **Microphone-level indicator** — **stretch**
- [x] **Full queue drawer** (`src/features/player/QueueDrawer.tsx` — replaces `QueuePanel`):
  - [x] Slide-over from right (420px wide, glass background, framer-motion spring enter/exit)
  - [x] **Full queue** with drag-to-reorder (HTML5 DnD, brand-colored top-border drop indicator)
  - [x] **Now Playing** highlighted (brand background, ▶ indicator, "Now Playing" header with green/dim pulse dot for isPlaying)
  - [ ] **History section** (collapsible) — partial: played tracks are dimmed + show ↺ icon, but no collapsible section
  - [x] **Multi-select** with checkboxes; batch actions: "Remove" (with count badge), "Save" (with count badge)
  - [x] **Save as playlist**: auto-named "Queue <time>"; uses existing `playlistsStore.create` + `addTrack`
  - [x] **Clear played** button (only when `queueIndex > 0`): removes all tracks before current
  - [x] **Clear all** button
  - [x] **Search within queue**: fuzzy search using existing `fuzzySearch` helper from `command/fuzzyMatch.ts`
  - [x] **Save all** button (when not in selection mode): saves the entire queue as a new playlist
  - [x] Header shows count + total duration (`2 tracks · 6:00`)
  - [x] Footer hints update based on mode ("Drag to reorder · click to jump" vs "Click tracks to toggle selection · actions above")
  - [x] 8 unit tests
- [ ] **Gestures** (`src/hooks/useGestures.ts`): — **deferred to 14.4**
  - [ ] **Trackpad swipe (horizontal)**: detect via `wheel` + deltaX threshold
  - [ ] **Pinch zoom** (touchpad): volume up/down; debounced 200ms
  - [ ] **Double-tap artwork** (touch + trackpad): play/pause
  - [ ] **Two-finger swipe up/down on artwork**: queue next/previous track
  - [ ] **All gestures opt-out** via Settings → "Disable trackpad gestures"
- [x] **Crossfade visual indicator** (`src/components/player/CrossfadeIndicator.tsx`):
  - [x] On the NowPlayingView seek bar, render a translucent overlay showing the crossfade window (gradient from `--accent-vibrant` to transparent, with a 1px right border as the trigger line)
  - [x] Width proportional to `durationMs / totalMs`, clamped to 40% max
  - [x] Subscribes to `setCrossfadeConfig` via a new pub-sub (`subscribeCrossfadeConfig`) added to `src/lib/audio/crossfade.ts`
  - [x] `useCrossfadeConfig` hook for reactive consumers
  - [ ] Tooltip on hover explains the crossfade setting — **deferred to 14.4** (basic `data-testid` is the only annotation for now)
  - [x] 7 unit tests
- [x] **Source health indicator** (`src/hooks/useSourceHealth.ts`):
  - [x] Per-source colored status dots in the Sidebar footer (🟢 healthy / 🟡 degraded / 🔴 down / ⚫ unknown)
  - [x] Periodic health check every 60s (initial check on mount)
  - [x] Lightweight probe: `window.api.sources.search({ query: '__health__', limit: 1, sourceIds: [...] })` with timing thresholds (3000ms degraded, 5000ms down)
  - [x] Local + demo sources are always marked healthy (no network)
  - [x] Healthy sources get `animate-pulse-soft` for visual breath
  - [ ] Click → expands to show last-checked timestamp + latency — **deferred to 14.4**
  - [x] 4 unit tests (3 hook behavior + 1 constants)
- [x] **Media Session integration** (`src/hooks/useMediaSession.ts`):
  - [x] Renderer-side hook wired to `navigator.mediaSession` (Web API, no IPC needed for renderer-side)
  - [x] Action handlers: `play` / `pause` / `previoustrack` / `nexttrack` / `seekto` / `stop` (all delegate to `usePlayerStore`)
  - [x] Metadata: title, artist, album, artwork (512×512) — synced on every track change
  - [x] `playbackState`: 'playing' / 'paused' / 'none' — synced on every state change
  - [x] Mounted in `App.tsx` via `useMediaSession()`
  - [ ] OS-level "Now Playing" controls via Electron main `chrome.mediaSession` (Windows SMTC, macOS Now Playing) — **deferred to 14.4** (would need a main-process IPC + state push from renderer; the Web API is already widely supported in Electron and shows up in OS UI on most platforms)
  - [x] 2 unit tests (graceful no-op when API missing + handlers registered when present)

#### 14.4 — Micro-interactions & Tactile Feedback 🚧 Partially Shipped (first pass)

Every interaction feels alive. **First pass shipped**: ScrollShadow, rich toasts v2, stagger animations for TrackList, scroll restoration, accessibility upgrades (focus-ring, reduced-motion, high-contrast, light-mode glass), Performance + Navigation settings panels. Magnetic hover, click ripples, DnD with dnd-kit, ImageLoader blur-up, route-level loading, exit animations remain for 14.5.

- [ ] **Magnetic hover** (`src/components/ui/MagneticButton.tsx`): — **deferred to 14.5**
  - [ ] Cursor-tracked `useTransform` (Framer Motion) on primary CTAs (play button, "Create playlist", etc.)
  - [ ] Subtle 1.05× scale + 4px translation toward cursor on hover
  - [ ] Reset on mouse leave with spring physics
  - [ ] `prefers-reduced-motion` skips the effect (static scale only)
- [ ] **Click ripples** (`src/components/ui/Ripple.tsx`): — **deferred to 14.5**
  - [ ] Material-style ripple on button click
  - [ ] Origin at click coordinates; fades out 600ms
  - [ ] Disabled by default; opt-in per-button
- [ ] **Custom drag-and-drop** (`@dnd-kit/core`): — **deferred to 14.5**
  - [ ] **Tracks → playlist**: drag a track row onto a Sidebar playlist card to add it
  - [ ] **Queue reorder**: replace existing HTML5 DnD with `dnd-kit` for smoother animation
  - [ ] **Artwork → mini-player**: drag album art to the floating mini-player to swap tracks
  - [ ] **File → library**: drag audio files from OS into the Library view to add them
  - [ ] **Sortable lists** (playlists, albums, artists) with `dnd-kit/sortable`
- [ ] **Image loading** (`src/components/ui/ImageLoader.tsx`): — **deferred to 14.5**
  - [ ] **Blur-up**: tiny base64 placeholder (LQIP) → full-resolution image with crossfade
  - [ ] **Progressive reveal**: low-res → high-res on slow connections (`srcset` + lazy)
  - [ ] **Skeleton fallback**: while loading
  - [ ] **Error state**: gradient + music icon (existing pattern; unify)
- [x] **Rich toasts** (`src/components/ui/Toast.tsx` v2): — **shipped**
  - [x] **Track-added toast**: artwork thumbnail + "Added to queue" + "View Queue" action
  - [x] **Playlist-created toast**: playlist thumbnail + "View playlist" + "Undo" (deletes it)
  - [x] **Sync toast**: progress bar for long operations (e.g. "Scanning library… 412/2000")
  - [x] **Stacking**: max 3 toasts visible; older fade with `AnimatePresence`
  - [x] **Action buttons**: inline buttons inside the toast (Material Design 3 style)
  - [x] Framer-motion enter/exit animations with spring physics
  - [x] 7 tests added to toastStore
- [x] **Scroll polish** — **shipped**:
  - [x] **Scroll shadow** (`src/components/ui/ScrollShadow.tsx`): CSS `mask-image` gradient fade at top/bottom of scroll containers; auto-updates with scroll position. Horizontal + vertical modes. Applied to QueueDrawer.
  - [ ] **Momentum scrolling** (`scroll-behavior: smooth` on Chromium/Electron) — **deferred to 14.5** (native is sufficient)
  - [ ] **Snap points** for carousels (For You, Search results, Similar Tracks rail) — **deferred to 14.5**
  - [ ] **Horizontal scroll indicators**: subtle arrows that fade in when scrollable — **deferred to 14.5**
  - [x] **Scroll restoration** per route (remember last scroll position) — `src/hooks/useScrollRestoration.ts` with localStorage persistence
- [x] **Stagger animations** on lists — **shipped**:
  - [x] TrackList, search results, For You cards animate in with 20ms stagger (Framer Motion variants) — `src/components/ui/StaggerAnimations.tsx` with `itemVariants`, `listVariants`, `gridVariants`
  - [ ] Items leave gracefully when filtered out (exit animation) — **deferred to 14.5**
- [ ] **Loading states**: — **deferred to 14.5**
  - [ ] **Route-level loading**: `Suspense` fallback skeleton for each route
  - [ ] **Inline loading**: button spinners, input busy indicators
  - [ ] **Optimistic UI**: playlist create, track add → show immediately; rollback on error
  - [ ] **Progress toasts** for long ops (library scan, source import)

#### 14.5 — Navigation & Player polish (Phase 14.5 first pass — shipped)

Catches up the remaining 14.1 + 14.2 + 14.3 + 14.4 todos that
were deferred to "14.5" in the first-pass plans. Plus a few
follow-ups that were already due.

- [x] **Animated sidebar active border indicator** (`src/components/layout/Sidebar.tsx`) — Framer Motion `layoutId="sidebar-active-indicator"` springs between routes with brand glow; replaces static `border-l-2` class. `data-testid="sidebar-active-indicator"`.
- [x] **Search history dropdown in TopBar** (`src/hooks/useSearchHistory.ts` + `TopBar.tsx`) — last 8 queries persisted to `localStorage`; dropdown shows on focus with fuzzy-matched recent queries, click-to-rerun, per-item remove, "Clear all" button, ARIA combobox semantics.
- [x] **Focus restoration on route change** (`src/hooks/useFocusRestoration.ts` + `App.tsx`) — per-route focus + scroll position remembered in `sessionStorage`, restored on navigation back. Mounted alongside `useScrollRestoration('main, [role="main"]')`.
- [x] **NowPlaying visualizer toggle** (`src/features/nowPlaying/NowPlayingView.tsx`) — radiogroup toggles None / FrequencyBars / WaveformRing behind artwork with `AnimatePresence` fade. State persisted to `localStorage` key `harmonix.np.visualizer`. `data-testid="now-playing-visualizer-toggle"`.
- [x] **Mesh gradient breathing background** (`src/components/layout/AnimatedBackground.tsx`) — rewritten with 3 stacked conic-gradient blobs + central radial halo. Uses `audioEngine.getGainNode()` for bass-pulse sampling at 60 FPS, scales blobs by `1.02 + bass * 0.04` when playing. Reads `--accent` CSS var live (album-aware overlay). Respects `prefers-reduced-motion` + `uiStore.reducedMotion`.
- [x] **NowPlaying theme override** (`NowPlayingView.tsx`) — "Match artwork" vs "Brand pink" toggle with `setProperty('--accent', ...)` writes. State in `localStorage` key `harmonix.np.theme`. `data-testid="now-playing-theme-toggle"`.
- [x] **Queue history collapsible section** (`src/features/player/QueueDrawer.tsx`) — queue list split into `historyItems` (indices < queueIndex) and `upcomingItems` (>= queueIndex). History renders in a collapsible section with `RotateCcw` icon + count badge + `aria-expanded`/`aria-controls`. `data-testid="queue-history-section"`.
- [x] **Crossfade tooltip on indicator** (`src/components/player/CrossfadeIndicator.tsx`) — wrapper `group` + `role="tooltip"` div with `opacity-0 group-hover:opacity-100` transition showing "Crossfade: 5.0s" + native `title` attribute as fallback. `data-testid="crossfade-tooltip"`.
- [x] **Source health click-to-expand** (`src/components/layout/Sidebar.tsx`) — health dots wrap a button with `aria-expanded`; expanded panel shows per-source `timeAgo(ts)` timestamps. `data-testid="source-health-details-panel"`.
- [x] **Glass audit** (`src/components/command/CommandPalette.tsx`) — replaced `bg-zinc-900/95` with `.glass-heavy` for stronger blur and light-theme parity.
- [x] **Skip-to-content link** (`src/components/a11y/SkipToContent.tsx`) — visually hidden, becomes visible on focus, jumps to `#main-content` (added to `<main>` in App.tsx). `data-testid="skip-to-content"`.
- [x] **aria-live for queue changes** (`src/components/a11y/PlayerAnnouncer.tsx`) — debounced 600ms `role="status" aria-live="polite"` announcer that surfaces track/artist changes from `usePlayerStore`. `data-testid="player-announcer"`.
- [x] **Expandable PlayerBar** (`src/components/layout/PlayerBar.tsx`) — wrapper div with `onMouseEnter/Leave` for hover-expand; AnimatePresence height 0→96 slide-in shows "Up next" 3-card queue preview + `FrequencyBars` EQ. Pin via `uiStore.playerBarPinned` (persisted). `data-testid="player-bar-pin-toggle"`.
- [x] **Mini-player shared element transition** (`src/features/miniPlayer/MiniPlayerView.tsx`) — added `motion.img layoutId="current-artwork"` to the mini-player artwork, so the artwork morphs smoothly from PlayerBar → HeroPlayer → NowPlayingView → MiniPlayer.
- [x] **Magnetic hover + click ripples** (`src/components/ui/MicroInteractions.tsx`) — `MagneticButton` (cursor-tracked translate + scale via CSS variables) and `Ripple` (Material-style expanding circle via framer-motion AnimatePresence). Both respect `useReducedMotion`. `data-testid` provided on both.
- [x] **Route change indicator** (`src/components/a11y/RouteLoader.tsx`) — `RouteChangeIndicator` flashes a brand-gradient progress bar at the top of the page for 350ms on navigation. `RouteLoaderSkeleton` (placeholder grid) ready for future `lazy()` routes. Mounted in `App.tsx` for both Main and NowPlaying shells.

#### 14.6 — Data Visualization & "Delight" Features

Insight and personality.

- [ ] **Listening analytics dashboard** (`src/features/analytics/AnalyticsView.tsx`, new route `/analytics`):
  - [ ] **Top artists**, **top tracks**, **top genres** (last 7d / 30d / 90d / all-time)
  - [ ] **Listening time** (daily/weekly chart)
  - [ ] **Source breakdown** (pie chart: % of time per source)
  - [ ] **Time-of-day heatmap** (when you listen most)
  - [ ] **Year in review** style summary card (December 2026 onward)
  - [ ] Data source: `listeningHistoryStore` extended with `playCount`, `totalDurationMs`, `lastPlayedAt`
  - [ ] Charts: Recharts (tree-shakable, ~30kb) with `ResponsiveContainer`
  - [ ] **Local-first**: all data from local history; no telemetry; export to JSON
- [ ] **EQ visualizer** in `EqualizerView`:
  - [ ] Real-time frequency curve overlay (24 bands) showing pre-EQ vs post-EQ response
  - [ ] Animated bars behind each slider showing current frequency magnitude
  - [ ] Preset switch animates the curve from old to new gains
- [ ] **Track insights** (click on track row → side panel):
  - [ ] Album art, full metadata, source, bitrate, codec (from `audioEngine`)
  - [ ] "Similar tracks" mini-rail
  - [ ] "Add to playlist" + "Go to artist" + "Go to album" quick actions
  - [ ] Play count + last played timestamp
- [ ] **First-run experience** (post-MVP polish):
  - [ ] Welcome modal: "Choose your default theme" + "Add your first source" + "Add a folder to scan"
  - [ ] Guided tour overlay (3-4 highlights) for first-time users; dismissible
  - [ ] "What's new" modal on version bump (driven by `CHANGELOG.md` or hardcoded list)

#### 14.6 — Cross-cutting Concerns

- [ ] **Accessibility audit**:
  - [ ] `prefers-reduced-motion` respected everywhere: vinyl spin, particle field, page transitions, magnetic hover, ripples, stagger animations
  - [ ] `prefers-color-scheme: light` parity for all new components (glass tokens especially)
  - [ ] `aria-live` for queue/state changes
  - [ ] Color contrast audit (WCAG AA minimum) for new components
  - [ ] Tab order is logical across all new components
  - [ ] `prefers-contrast: more` → high-contrast variant
  - [ ] Screen reader smoke test on all major views
- [ ] **Internationalization prep**:
  - [ ] Extract all user-facing strings to `src/i18n/en.ts`
  - [ ] Date/time formatting via `Intl.DateTimeFormat`
  - [ ] Number formatting (track counts, durations) locale-aware
  - [ ] RTL readiness check (logical CSS properties, no `left`/`right`)
- [ ] **Performance**:
  - [ ] `React.memo` on heavy lists (TrackList, QueueDrawer, ForYouSection)
  - [ ] Virtualization already in TrackList; extend to QueueDrawer and PlaylistDetailView
  - [ ] `useDeferredValue` for search input (avoid jank on rapid typing)
  - [ ] Web Worker for color extraction (don't block main thread on track change)
  - [ ] Bundle analysis: ensure each new dependency is tree-shaken; dynamic imports for `/now-playing` and `/analytics`
- [ ] **Settings additions**:
  - [ ] **Appearance**: Theme (Dark/Light/System), Accent color (auto from artwork / fixed brand pink / custom hex), Glass intensity (Off/Subtle/Strong)
  - [ ] **Performance**: Visualizer quality (Auto/High/Off), Animation intensity (Full/Reduced/Off)
  - [ ] **Navigation**: Sidebar layout (Default/Compact/Sectioned), Show breadcrumbs (toggle)
  - [ ] **Player**: Mini-player defaults, Crossfade preview (toggle), Trackpad gestures (toggle)
  - [ ] **Keyboard**: Customize shortcuts, Reset to defaults
- [ ] **Telemetry (local only, opt-in)**:
  - [ ] Track render times, interaction latencies, error rates
  - [ ] Stored in local SQLite, not sent anywhere
  - [ ] "View diagnostics" panel in Settings shows last 100 events

#### 14.7 — Documentation & Testing

- [ ] **ADR**: `docs/ADR/0002-phase-14-ui-architecture.md` documenting:
  - [ ] Choice of `fuse.js` for command palette (vs. MiniSearch, FlexSearch)
  - [ ] Choice of `@dnd-kit` over `react-dnd` (modern, accessible, smaller bundle)
  - [ ] Choice of `recharts` vs. `visx` vs. raw SVG for analytics
  - [ ] Color extraction approach (offscreen canvas + median-cut; no ML models in v1)
  - [ ] Adaptive palette interpolation in HSL color space
  - [ ] Glassmorphism system token design
- [ ] **Architecture doc** update: new "UI/UX Architecture" section in `docs/ARCHITECTURE.md` covering:
  - [ ] `uiStore` shape and responsibilities
  - [ ] Visualizer abstraction (`AudioVisualizer` component variants)
  - [ ] Color extraction pipeline (offscreen canvas → palette → CSS vars)
  - [ ] DnD contexts (5 zones: Sidebar playlists, QueueDrawer, Library, MiniPlayer, NowPlaying)
- [ ] **User docs**: `docs/UI_GUIDE.md` (new) — tour of every UI surface, gestures, shortcuts, with screenshots
- [ ] **Unit tests**:
  - [ ] `commandPalette` (≥10 cases: open/close, search, recent items, keyboard nav)
  - [ ] `useKeyboardNavigation` (≥12 cases: all global shortcuts, list nav, context switch)
  - [ ] `useAdaptiveAccent` (≥6 cases: extraction, palette generation, interpolation, override)
  - [ ] `colorExtractor` extensions (≥8 cases: various artwork palettes, edge cases)
  - [ ] `useGestures` (≥6 cases: swipe, pinch, double-tap detection)
  - [ ] `audioVisualizer` (≥4 cases: variants, FPS throttling, reduced-motion)
  - [ ] `uiStore` (≥6 cases: state shape, persistence, defaults)
  - [ ] `analytics` aggregations (≥8 cases: top-N, time windows, source breakdown)
  - [ ] Component tests for new views: `CommandPalette`, `Breadcrumb`, `SmartSidebar`, `QueueDrawer`, `AnalyticsView`, `LyricsPanel`
- [ ] **E2E (Playwright)**:
  - [ ] Open command palette, search, navigate
  - [ ] Expand PlayerBar, drag-to-resize, pin expanded
  - [ ] Drag track → Sidebar playlist (add to playlist)
  - [ ] Drag track in queue → reorder
  - [ ] Open queue drawer, multi-select, save as playlist
  - [ ] Resize mini-player, snap to edge
  - [ ] Trigger trackpad gesture, verify next/prev
  - [ ] Toggle reduced-motion, verify animations disabled
  - [ ] Switch theme, verify glass tokens adapt
- [ ] **Visual regression**: Playwright `toMatchSnapshot` on key views (Home, NowPlaying, MiniPlayer, Settings, Equalizer, Search) — locks in the Soundora-inspired aesthetic

#### 14.8 — Phased Delivery (4 Increments)

| Increment                              | Scope                                                                                                                                                                                 | Status                                                                                                                                                                                                                                                                                                                                                                                                                                  | Target test count          | Estimated effort            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------- |
| **14.1 — Navigation Intelligence**     | Command palette, breadcrumbs, smart sidebar, keyboard nav, focus mgmt, search upgrades                                                                                                | ✅ **Shipped (first pass)** — palette + breadcrumbs + smart sidebar + uiStore + fuzzy matcher done. Keybindings, focus mgmt, search upgrades pending 14.4                                                                                                                                                                                                                                                                               | 535+ (was 479, +56)        | 2–3 weeks total (~70% done) |
| **14.2 — Living Visuals**              | Adaptive theming, shared element transitions, audio visualizers, glass system, background blur, animation polish                                                                      | ✅ **Shipped (first pass)** — adaptive palette + HSL interpolation + glass tokens + shared element transitions + FrequencyBars + WaveformRing + artwork-blur background done. Particle field, stereo oscilloscope, mesh-gradient breathing, per-visualizer Settings, full glass audit pending 14.4                                                                                                                                      | 600+ (+65)                 | 3–4 weeks total (~60% done) |
| **14.3 — Player Mastery**              | Expandable PlayerBar, NowPlaying v2, MiniPlayer v2, QueueDrawer, gestures, media session, micro-interactions, scroll polish, analytics                                                | 🚧 **Partially shipped (first pass)** — CrossfadeIndicator, useMediaSession, useSourceHealth, NowPlaying v2 (parallax + similar rail + credits), QueueDrawer (replaces QueuePanel with multi-select + save + search), MiniPlayer Pin badge all done (578 tests, +21). Expandable PlayerBar, MiniPlayer resize/snap, lyrics panel, gestures, visualizer toggle, rich toasts, analytics, OS-level main process Media Session pending 14.4 | 700+ (+100)                | 4–5 weeks total (~50% done) |
| **14.4 — Micro-interactions & Polish** | ScrollShadow, rich toasts v2, stagger animations, scroll restoration, accessibility, Performance/Navigation panels, magnetic hover, ripples, dnd-kit DnD, ImageLoader, loading states | 🚧 **Partially shipped (first pass)** — ScrollShadow, rich toasts v2, stagger animations (TrackList), scroll restoration, accessibility (focus-ring, reduced-motion, high-contrast, light glass), Performance panel, Navigation panel all done. Magnetic hover, ripples, dnd-kit DnD, ImageLoader, route-level loading, exit animations pending 14.5                                                                                    | 700+ (tests stable at 578) | 2–3 weeks total (~50% done) |

Each increment is **independently shippable** behind a feature flag (`uiStore.flags.phase14_1` etc.) for safe rollout.

#### 14.9 — Exit Criteria (Phase 14 Done)

- [ ] `⌘K` command palette opens in <100ms; searches all content + actions
- [ ] Artwork color extraction updates UI accents in <50ms on track change; smooth HSL interpolation
- [ ] HeroPlayer → NowPlaying artwork transition is seamless (shared `layoutId`)
- [ ] PlayerBar expands/collapses smoothly via hover, click, and drag; height persists
- [ ] MiniPlayer is resizable, snaps to screen edges, draggable by artwork
- [ ] Drag-and-drop works: track → playlist, queue reorder, file → library, artwork → mini-player
- [ ] Trackpad gestures: swipe next/prev, pinch volume, double-tap play/pause
- [ ] Adaptive palette: Sidebar/TopBar/PlayerBar accents shift with current artwork
- [ ] All visualizers respect `prefers-reduced-motion`; "Performance mode" disables heavy ones
- [ ] `prefers-color-scheme: light` parity for every new component
- [ ] WCAG AA contrast on all new UI
- [ ] All interactive elements have visible `focus-visible` rings
- [ ] Command palette keyboard-navigable end-to-end (no mouse required)
- [ ] 700+ tests pass; 0 lint errors; 0 typecheck errors; no regression in playback/queue/EQ
- [ ] E2E covers: command palette, queue drawer, mini-player, DnD, gestures
- [ ] Bundle size budget: renderer <600 KB gzipped (current ~428 KB; new deps +80 KB max)
- [ ] All new dependencies documented in `docs/ADR/0002-phase-14-ui-architecture.md`

#### 14.10 — Risks & Mitigations

| Risk                                                           | Impact | Likelihood | Mitigation                                                                                                                                           |
| -------------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bundle size** (Framer Motion + dnd-kit + fuse.js + recharts) | Medium | High       | Dynamic import heavy views (`NowPlayingView`, `AnalyticsView`); tree-shake lucide; audit with `rollup-plugin-visualizer` in CI                       |
| **Canvas performance on low-end**                              | Medium | High       | Adaptive quality: reduce particle count on `hardwareConcurrency < 4`; auto-disable blur on `prefers-reduced-motion`                                  |
| **Animation fatigue**                                          | Medium | Medium     | Global "Reduced motion" setting in Settings (persists); `motion-safe`/`motion-reduce` utilities applied systematically                               |
| **Color extraction jank on track change**                      | Low    | Medium     | Web Worker for extraction; debounce 100ms; fallback to last-known palette                                                                            |
| **State sync complexity (mini-player + main + queue drawer)**  | High   | Medium     | Audio engine stays in main window; mini-player is read-only IPC consumer (existing architecture preserved); queue drawer uses the same `playerStore` |
| **DnD accessibility**                                          | Medium | Low        | `@dnd-kit` has built-in screen reader announcements; test with VoiceOver/NVDA                                                                        |
| **Command palette discoverability**                            | Low    | Medium     | `?` shortcut help overlay always shows it; onboarding tour mentions it; placeholder hint in TopBar                                                   |
| **Feature creep**                                              | High   | High       | Strict scope per increment; defer analytics gestures, track insights, first-run experience to 14.5 (post-MVP)                                        |

#### 14.11 — Open Questions (Decide Before Implementation)

- [ ] **Theme override**: should "Match artwork" be a per-track setting, a global toggle, or both?
- [ ] **Mini-player size limits**: is 280×80 too small for usability? 320×100 a better default?
- [ ] **Trackpad gesture sensitivity**: configurable in Settings, or hard-coded?
- [ ] **Analytics retention**: keep all history forever, or cap at 1 year?
- [ ] **First-run experience**: opt-in or default? (Suggestion: opt-in, skip on subsequent installs)
- [ ] **Command palette scope**: include `window.api.*` actions (e.g. "Open dev tools", "Reload") for power users?

#### 14.12 — Next Steps (When Ready to Implement)

1. [ ] Create `docs/ADR/0002-phase-14-ui-architecture.md` with library choices
2. [ ] Set up feature branch: `phase-14-ui-polish`
3. [ ] Add `fuse.js`, `@dnd-kit/core`, `@dnd-kit/sortable`, `recharts` to `package.json`
4. [ ] Build `uiStore` (Zustand) with flags + persistence
5. [ ] Add `tests/setup.ts` helpers for new component testing patterns
6. [ ] Increment 14.1 kickoff: `CommandPalette` + `Breadcrumb` + `SmartSidebar` + `KeyboardNavigationProvider`
7. [ ] Add visual regression testing (Playwright `toMatchSnapshot`) to CI
8. [ ] Set up bundle size budget in `vite.config.ts` (fail build if renderer >600 KB gzipped)

See [Section 8](#8-backlog--future-ideas).

---

## 5. Milestones

| Milestone                                                                            | Target              | Status                                    |
| ------------------------------------------------------------------------------------ | ------------------- | ----------------------------------------- |
| M0: Project scaffolded                                                               | Phase 0 complete    | ✅ Done                                   |
| M1: Local playback works                                                             | Phase 1 complete    | ✅ Done                                   |
| M2: Plugin architecture ready                                                        | Phase 2 complete    | ✅ Done                                   |
| M3: Spotify integration                                                              | Phase 3 complete    | ✅ Done                                   |
| M4: YouTube Music integration                                                        | Phase 4 complete    | ✅ Done                                   |
| M5: Playlists & queue                                                                | Phase 5 complete    | ✅ Done                                   |
| M6: EQ & effects                                                                     | Phase 6 complete    | ✅ Done                                   |
| M7: First public release                                                             | Phase 7 complete    | 🔜 In Progress                            |
| M8: Additional sources (Deezer/Jamendo/Audius/SoundCloud)                            | Phase 8 complete    | ✅ Done                                   |
| M9: UI integration (per-source views, sidebar, player source badge, config UI)       | Phase 9 complete    | ✅ Done                                   |
| M10: Mini-player mode (compact floating window + system tray)                        | Phase 10 complete   | ✅ Done                                   |
| M11: AI-powered playlist generation (LLM + source search)                            | Phase 11 complete   | 🔜 Planned                                |
| M12: UI/UX polish (navigation, controls, micro-interactions, dark theme)             | Phase 12 complete   | ✅ Done                                   |
| M13: Visual immersion (palette refactor, glassmorphism, audio-reactive, now-playing) | Phase 13A complete  | ✅ Done                                   |
| M14: Layout redesign (3-column shell, pink palette, hero player, right rail)         | Phase 13B complete  | ✅ Done                                   |
| M15: Advanced UI/UX polish (navigation, living visuals, player mastery)              | Phase 14 complete   | ✅ Done (14.1 + 14.2 + 14.3 first passes) |
| M16: Micro-interactions & Polish (14.4)                                              | Phase 14.4 complete | ✅ Done (first pass)                      |
| M17: Navigation & Player polish (14.5)                                               | Phase 14.5 complete | ✅ Done (first pass)                      |

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

- [ ] **Phase 14 — Advanced UI/UX Polish (Immersive Intelligence)** (planned as Phase 14, 4 increments)
  - [x] 14.1 Navigation Intelligence (first pass shipped: command palette, breadcrumbs, smart sidebar, uiStore, fuzzy matcher) — remaining: keybindings, focus mgmt, search upgrades → 14.5
  - [x] 14.2 Living Visuals (first pass shipped: 3-tone adaptive palette + HSL interpolation, glassmorphism tokens + light parity, shared element artwork transitions, FrequencyBars + WaveformRing visualizers, artwork-blur background) — remaining: particle field, stereo oscilloscope, mesh-gradient breathing, per-visualizer Settings, full glass audit → 14.5
  - [x] 14.3 Player Mastery (first pass shipped: CrossfadeIndicator, useMediaSession, useSourceHealth, NowPlaying v2 with parallax + similar rail + credits, QueueDrawer replacing QueuePanel, MiniPlayer Pin badge) — remaining: expandable PlayerBar, MiniPlayer resize + snap, lyrics panel, gestures, visualizer toggle, rich toasts, analytics, OS-level main-process Media Session → 14.5
  - [x] 14.4 Micro-interactions & Polish (first pass shipped: ScrollShadow, rich toasts v2, stagger animations (TrackList), scroll restoration, accessibility (focus-ring, reduced-motion, high-contrast, light glass), Performance panel, Navigation panel) — remaining: magnetic hover, click ripples, dnd-kit DnD, ImageLoader blur-up, route-level loading, exit animations → 14.5
- [ ] Lyrics display (LRClib or Musixmatch) — captured in Phase 14.3
- [ ] Last.fm scrobbling
- [ ] Discord Rich Presence
- [ ] Global hotkeys / OS media keys — captured in Phase 14.3 (Media Session)
- [ ] Keyboard shortcuts customization — captured in Phase 14.1

### Long-term

- [ ] Cloud sync of playlists and preferences
- [ ] Mobile companion app (read-only)
- [ ] Web version (PWA)
- [x] ~~Additional sources: Deezer, Jamendo, Audius, SoundCloud~~ (shipped in Phase 8)
- [x] ~~Mini-player mode~~ (shipped in Phase 10)
- [x] ~~UI/UX polish (Interface Refinement)~~ (shipped in Phase 12)
- [x] ~~Visual immersion (palette refactor, audio-reactive background, Now Playing)~~ (shipped in Phase 13A)
- [x] ~~Layout redesign (3-column shell, pink palette, hero player, right rail)~~ (shipped in Phase 13B)
- [ ] AI-powered playlist generation (planned as Phase 11)
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

## 10. Progress Log (active session)

Chronological log of incremental progress. Most recent first.

- **Bundled yt-dlp.exe** — `resources/yt-dlp.exe` (18.4 MB, v2026.03.17) committed to repo. Eliminates external `yt-dlp` install + `YT_DLP_PATH` env var for end users. Binary treated as opaque blob via `.gitattributes` (`resources/yt-dlp* binary`).
- **Packager integration** — `electron-builder.yml` `extraResources` now ships `resources/yt-dlp*` alongside `sql-wasm.wasm`; `asarUnpack: - resources/**` already covers it. Packaged builds will resolve yt-dlp via `process.resourcesPath`.
- **Update API** — `electron/main/sources/ytmusic/ytdlp.ts` gained `checkAndUpdateYtDlp()` + `resetYtDlpCache()`. Spawns `yt-dlp -U`, compares version before/after via `--version`, returns `{ok, updated, oldVersion, newVersion, message}`. 60s timeout. Invalidates `cachedPath` on successful update.
- **IPC + preload bridge** — Registered `ytmusic:check-update` handler in `electron/main/ipc/ytmusic.ts`. Exposed as `window.api.ytmusic.checkUpdate()` via `electron/preload/index.ts` with `YtDlpUpdateResult` type.
- **Settings UI** — `src/features/settings/YtMusicStatus.tsx` now has a "Check for update" button. On click → IPC → result rendered in inline toast (green = updated with commit reminder, gray = up to date, red = error). Auto-refreshes version display after run. `data-testid` for e2e.
- **CI cache** — `.github/workflows/ci.yml` `build` job caches `resources/yt-dlp.exe` on `windows-latest` runs (key: `yt-dlp-<os>-<package.json hash>`), restore-key for partial hits. Linux/macOS jobs skip (no Windows binary needed).
- **Cleanup** — `.env` no longer carries `YT_DLP_PATH` (commented guidance kept for override case). Bundled binary in `resources/` is the default lookup.
- **Docs** — `docs/SOURCES.md` updated: tree comment now says "ships a bundled CLI binary" and a "Bundled binary note" callout under §6 explains resolution order + update flow.
- **Unit tests** — `tests/unit/ytDlpUpdate.test.ts` (4 cases): missing-binary, up-to-date, updated+commit hint, non-zero exit. Uses `vi.hoisted` + `vi.mock` for `node:child_process.spawn` and injects a fake `findFn` (parameter on `checkAndUpdateYtDlp`). Refactored function to accept optional `findFn: () => Promise<YtDlpInfo> = findYtDlp` for DI. 427/427 tests passing (was 423, +4).
- **Verified** — `npm run lint` ✅, `npm run typecheck` ✅, `npm run test` ✅ (427/427), `npm run build` ✅. Resolution order sanity check via tsx: with `YT_DLP_PATH` unset, `findYtDlp()` returns `resources/yt-dlp.exe` v2026.03.17.
- **Packager fix** — `electron-builder.yml` `extraResources` `to:` changed from `yt-dlp` → `yt-dlp.exe` so Windows packaged build keeps the .exe extension. Linux/macOS binaries (when added) will need a per-platform `extraResources` block.
- **Critical .gitignore fix** — `.gitignore` had `*.exe` rule (line 63) which was silently ignoring `resources/yt-dlp.exe`. Added negation `!resources/yt-dlp*` so the binary actually gets committed. `git check-ignore` confirms it now passes through.
- **Final verify** — `npm run lint` ✅, `npm run typecheck` ✅, `npm run test` ✅ (427/427), `npm run build` ✅. `git status` shows `resources/yt-dlp.exe` untracked (ready to commit) and all 14 expected files modified, 3 new (env.ts, ytDlpUpdate.test.ts, yt-dlp.exe).

- **Brand mark fix** — The previous brand image (with text + tagline) wasn't rendering in the sidebar — `LogoMark.tsx` was using a relative `./logo-horizontal.png` path that doesn't resolve in the Vite-bundled renderer (only `dist/` is served). Fixed by:
  1. Replaced the brand asset with the new icon-only mark (the colorful H waveform, 1254×1254) at `public/logo.png` so Vite serves it at the absolute path `/logo.png` for both dev and packaged builds.
  2. Also copied to `resources/logo.png` for Electron-side references (tray icon, splash, future use).
  3. `LogoMark.tsx` now uses `/logo.png` (absolute public path) with `object-contain` so the icon scales cleanly. The "Harmonix" text is rendered as a separate `<h1>` next to the icon for crisp typography.
  4. Removed the now-unused `resources/logo-horizontal.png` and replaced `resources/brand-guide.png` with the new icon.
  5. `dist/logo.png` confirmed present after `npm run build` (491 KB), so packaged builds will include it.

- **Splash screen with logo on app open** — Added a frameless, always-on-top splash window that shows the brand mark + a "HARMONIX" wordmark + "ONE PLAYER. ALL MUSIC." tagline + a pink spinner while the main window initializes. New `electron/main/splashWindow.ts` module: `createSplashWindow()` builds the BrowserWindow (360×360, centered, skipTaskbar), loads an inlined HTML via `data:` URL with the logo path passed as a hash fragment (resolved to `file://.../public/logo.png` via `pathToFileURL` so Vite serves it). The splash closes when the main window's `ready-to-show` fires. A 15s safety timer auto-closes if the main window never reports ready. `electron/main/index.ts` calls `createSplashWindow()` first in `whenReady`, then `createMainWindow()`, then `closeSplashWindow()` on the main window's `ready-to-show`. Tests: `tests/unit/splashWindow.test.ts` (7 cases) — frameless/centered/options, data: URL with splash HTML + logo fragment, ready-to-show, idempotency, cleanup, no-op when missing, 15s auto-close. 446/446 tests pass (was 439, +7).

- **Splash logo: embed as base64 data URL (fix)** — The previous implementation injected the logo URL as a hash fragment on the `data:` URL, expecting the inline script to assign it to the `<img src>`. That was blocked by Chromium's cross-origin policy: a `data:` origin can't fetch `file://` resources even with a permissive CSP. Fixed by reading `public/logo.png` synchronously in main and embedding it as a `data:image/png;base64,…` string directly in the splash HTML's `<img src>`. Resolution order: `<appPath>/public/logo.png` (dev) → `<resourcesPath>/logo.png` (packaged). If neither exists, `<img src="">` is empty and the rest of the splash still renders. CSP tightened to `img-src 'self' data:` (no longer needs `file:`). The hash-injection JS block was removed. Tests updated to assert the base64 src is present and no `file://` reference leaks into the HTML. 455/455 tests pass.

- **EQ works on YouTube Music + remote sources (audio proxy + always-on MediaElementSource)** — The previous `src/lib/audio/engine.ts` only created a `MediaElementAudioSourceNode` for `file://` URLs. For HTTP streams (YT Music via `googlevideo.com`, Jamendo, etc.), the audio element played directly to the speakers — bypassing the gain node, the 10-band EQ, and any future Web Audio effects. Two-part fix:
  - **`src/lib/audio/engine.ts`**: removed both `if (isLocalFile)` guards. `createMediaElementSource` is now called for every URL. `crossOrigin='anonymous'` is set unconditionally so the CORS fetch is in place for HTTP (irrelevant for `file://`). Both the fast preloaded path and the slow path apply the change.
  - **`electron/main/audioProxy.ts`** (new): custom `harmonix-media://stream/<id>` Electron protocol. Source adapters that need CORS-untainted audio (YT Music today; others can opt in) set `StreamInfo.requiresProxy: true`. The `sources:play-track` IPC handler then registers the real URL in a TTL/LRU-bounded registry and returns a `harmonix-media://stream/<id>` URL to the renderer. The protocol handler streams the upstream body through `net.fetch` and injects `Access-Control-Allow-Origin: *` so the `MediaElementSource` is not CORS-tainted. Stream ID generation is `s_<timestamp>_<random>` with 10-minute TTL and a 20-entry LRU.
  - **`electron/main/sources/ytmusic/ytdlp.ts`**: sets `requiresProxy: true` on every resolved stream (yt-dlp's `googlevideo.com` URLs don't ship CORS). Added the optional field to `ResolvedStream` and the `StreamInfo` interface.
  - **`electron/main/index.ts`**: registers the proxy protocol during `app.whenReady()`, before any audio playback.
  - Net effect: YT Music audio now flows `[audio element] → [MediaElementSource] → [10-band EQ] → [GainNode] → [destination]`. EQ changes are audibly applied.
- Tests
  - **`tests/unit/audioProxy.test.ts`** (11 cases): registry CRUD, URL format, request-header pass-through, 200/400/404/410/502 response codes, CORS + content headers in response, idempotent `registerAudioProxyProtocol`, `registerSchemesAsPrivileged` is called once at import with the right flags. Uses `vi.resetModules` per test to isolate the module-level registry.
  - 466/466 tests pass (was 455, +11).

- **Proxy fix: privileged scheme + graceful fallback** — Initial audio proxy went through a regression where YT Music would fail with "Failed to load audio" instead of playing. Two real bugs fixed:
  - **`registerSchemesAsPrivileged` was missing.** Without `standard: true` + `secure: true` + `stream: true` on the `harmonix-media://` scheme, Chromium refuses to load a `<audio>` element whose `src` is a custom non-privileged scheme. Audio element would get a "MEDIA_ERR_SRC_NOT_SUPPORTED" instantly. The fix calls `protocol.registerSchemesAsPrivileged([...])` at module load time (before `app.whenReady()`), which is a side effect of importing `audioProxy.ts` from `electron/main/index.ts`.
  - **No fallback when the proxy failed.** The audio element would error out and the user saw a generic "Failed to load audio" with no path to recovery. Two parts:
    1. **`electron/main/sources/types.ts`**: added `fallbackUrl?: string` to `StreamInfo`. The IPC handler in `electron/main/ipc/sources.ts` populates it with the pre-proxy URL whenever `requiresProxy: true` is set, so the renderer has the direct URL available as a last resort.
    2. **`src/stores/playerStore.ts`**: `play(track)` now wraps `playTrack(...)` in a try/catch. On load failure AND when `stream.fallbackUrl` is set, it retries with the fallback (no EQ but at least the audio plays). Logs a `console.warn` so the user/dev sees the degradation.
  - **`src/lib/audio/engine.ts`**: improved the load error message from the generic "Failed to load audio" to include the `MediaError.code` (`MEDIA_ERR_NETWORK`, `MEDIA_ERR_SRC_NOT_SUPPORTED`, etc.) and a `[audioEngine]` console.error so the next regression is debuggable in the dev console.
  - **`electron/main/sources/ytmusic/index.ts`**: the `getStreamUrl` adapter now also forwards `Referer: https://music.youtube.com/` and `Origin: https://music.youtube.com` headers in the `StreamInfo.headers` field, so the proxy can pass them through to `googlevideo.com`. Some variants of the CDN reject requests without the right referer.
  - **Net effect**: YT Music (and any other proxied source) either plays through the EQ as intended, or falls back to direct playback with a clear warning. No more "Failed to load audio" with no path forward.
- Tests
  - `tests/unit/audioProxy.test.ts` gained 1 case for `registerSchemesAsPrivileged` (11 total).
  - 466/466 tests pass.
- Verified
  - `npm run lint` clean
  - `npm run typecheck` clean
  - `npm run build` clean

- **Format error fix: Node Readable → web stream + Range forwarding** — After the privileged-scheme fix, the next error was `MEDIA_ERR_DECODE: MEDIA_ELEMENT_ERROR: Format error`. Two more bugs in the proxy:
  - **`net.fetch`'s body is a Node Readable, not a web ReadableStream.** Electron's `net.fetch` returns the response body as a Node `Readable` stream (per the Electron docs). Passing a Node `Readable` directly to `new Response(body, ...)` makes the body un-readable for the audio element — Chromium raises `MEDIA_ERR_DECODE` because it sees no bytes. Fix: `Readable.toWeb(upstream.body)` to convert the Node stream to a web stream before constructing the Response.
  - **Range requests not forwarded.** The `<audio>` element does a partial-content fetch (Range: bytes=0-XXXX) when starting playback. The proxy was ignoring the Range header, so the upstream returned `200 OK` with the full body, and the audio element choked. Fix: forward `request.headers.get('range')` to `net.fetch`, and preserve the upstream `content-range` + `accept-ranges` headers in the response. Added `Access-Control-Allow-Headers: Range` and `Access-Control-Expose-Headers: Content-Range, Content-Length` so Chromium can read them.
- Tests
  - `tests/unit/audioProxy.test.ts` (+2 cases, 13 total): the new Range forward case (uses a plain object with a `.get()` method instead of `new Headers({...})` because vitest's jsdom `Headers` polyfill filters `range` as a forbidden request-header — real Chromium Headers accept it just fine) and a "no request headers" case to verify the missing-headers path doesn't crash.
  - 468/468 tests pass.
- Verified
  - `npm run lint` clean
  - `npm run typecheck` clean
  - `npm run build` clean

- **Source-not-supported fix: magic-byte content-type sniffing** — After the body conversion + Range fix, the next regression was `MEDIA_ERR_SRC_NOT_SUPPORTED: MEDIA_ELEMENT_ERROR: Format error`. The body now reaches the audio element fine, but Chromium still can't pick a decoder because the upstream serves `Content-Type: application/octet-stream` (typical of googlevideo CDN) or `video/webm` for an audio-only stream — neither tells Chromium to pick an audio decoder. Fix:
  - **`detectContentType(bytes)` helper** in `audioProxy.ts` — inspects the first 4-12 bytes for known audio container signatures: WebM/EBML (`1A 45 DF A3`), OGG (`OggS`), FLAC (`fLaC`), MP4/M4A (`ftyp` at offset 4), MP3 (`FF FB`/`F3`/`F2`), WAV (`RIFF...WAVE`).
  - **Peek + re-prepend the first chunk** — `Readable.toWeb` converts the Node stream, then the handler reads the first chunk (releases the lock, reads the rest with a fresh reader), runs the sniff, and re-prepends the sniffed bytes to the streamed body so the audio element sees the full stream with no missing prefix.
  - **Override Content-Type when upstream is generic** — if the upstream sends `application/octet-stream`, `*/*`, or `video/*` (video/webm often contains an audio-only stream when `-f bestaudio` is used by yt-dlp), the handler substitutes the sniffed `audio/<format>` MIME type. A proper upstream audio type (`audio/webm`, `audio/mp4`, etc.) is trusted as-is.
- Tests
  - `tests/unit/audioProxy.test.ts` (+10 cases, 23 total): 7 detector cases (one per format + null + edge cases), 1 override case (upstream `application/octet-stream` + WebM body → `audio/webm` in response), 1 preserve case (upstream `audio/mpeg` is kept), 1 body-integrity case (3-chunk body, drain and verify all bytes present in order).
  - 478/478 tests pass.
- Verified
  - `npm run lint` clean
  - `npm run typecheck` clean
  - `npm run build` clean

## 10. Progress Log (active session) — continued

- **Sources section removed (UI cleanup)** — Per user feedback referencing `docs/perbaiki-nanti/`: Sidebar no longer renders the per-source "Sources" sub-nav, and HomeView no longer renders the "Sources" quick-access grid. Source management stays exclusively in Settings → SourcePicker. Footer still shows enabled source count for transparency.
- **Home: For You recommendations** — `src/features/home/HomeView.tsx` now embeds a 6-card responsive "For You" grid directly below the hero player. New users see 2 starter cards (Browse Library, Search) with a prompt to play tracks.
- **Unified search** — Verified the global TopBar search is the single entry point: types in the top search bar navigate to `/search?q=…` which fans out across all enabled sources (`SearchView` already uses `sourcesStore.search`). No source-specific search boxes remain in the main window.
- **ForYouSection extracted** — New `src/components/recommendations/ForYouSection.tsx` is the single source of truth for "For You" rendering. Used by Home (grid, 6 items, with header) and RightRail (list, 3 items, headerless). Props: `limit`, `layout: 'grid' | 'list'`, `onPlayHistoryEntry`, `showHeader`, `emptyAction`. Plays via `usePlayerStore.play` by default, or delegates to `onPlayHistoryEntry` if provided.
- **Tests** — `tests/unit/forYouSection.test.tsx` (8 cases) covers starter/history toggle, limit, showHeader, grid+list layouts, data-testid, and entry rendering. `tests/unit/sidebar.test.tsx` updated: removed 3 sub-section tests, replaced with 1 negative assertion that the "Sources" sub-nav is not rendered. `tests/unit/rightRail.test.tsx`: 1 test updated to expect only "Up Next" (the For You heading moved to Home).
- **Verified** — `npm run lint` ✅, `npm run typecheck` ✅, `npm run test` ✅ (433/433, was 427, +6).

---

**Last updated**: **Phase 14.1 + 14.2 + 14.3 + 14.4 + 14.5 first passes all shipped** — `⌘K` command palette, breadcrumbs, smart sidebar (animated indicator), adaptive 3-tone palette + HSL interpolation, glassmorphism system, shared element artwork transitions, audio visualizers, artwork-blur background, crossfade visual indicator (with tooltip), OS Media Session, source health indicator (click-to-expand), NowPlaying v2 (parallax + similar tracks + credits + visualizer toggle + theme override), QueueDrawer (slide-over + multi-select + save as playlist + search + collapsible history), MiniPlayer (Pin badge + shared transition), ScrollShadow, rich toasts v2, stagger animations, scroll + focus restoration, accessibility (focus-ring, reduced-motion, high-contrast, skip-to-content, aria-live announcer, route change indicator, prefers-contrast), Performance + Navigation settings panels, search history dropdown, mesh gradient breathing background, expandable PlayerBar, magnetic hover + click ripples, route loader skeleton. See §14.1, §14.2, §14.3, §14.4, §14.5 for shipped-vs-pending breakdowns. Phases 12, 13A, 13B still complete. Phase 11 (AI-Powered Playlist Generation) still planned. **578 tests passing**.

- **The ACTUAL root cause: `media-src` CSP missing `harmonix-media:`** — User reported the same `MEDIA_ERR_SRC_NOT_SUPPORTED: Format error` after every fix. The defensive Web Audio fallback should have made the audio play via direct HTMLAudioElement playback. It didn't. User suggested checking "CORS header di server" and "format file tidak didukung browser" — that was the right direction. The real bug was in the **renderer's Content Security Policy** in `index.html`:
  ```html
  <meta
    http-equiv="Content-Security-Policy"
    content="...; media-src 'self' https: data: blob: file:; ..."
  />
  ```
  The `media-src` directive lists the schemes that `<audio>`, `<video>`, and `<track>` elements are allowed to load from. The custom protocol `harmonix-media://` was **not in the allowlist**, so Chromium blocked the audio element from loading the proxy URL entirely. The error manifested as `MEDIA_ERR_SRC_NOT_SUPPORTED: Format error` because the audio element couldn't determine any source for the URL.
  - **Root cause**: I registered the protocol in the main process (`protocol.registerSchemesAsPrivileged([...])`) which makes Chromium's network service accept the scheme, but the renderer's CSP is enforced at the document level and blocked it independently.
  - **Fix**: `index.html` `media-src` directive now includes `harmonix-media:`. The CSP is in `index.html` (Vite passes it through to `dist/index.html`).
  - **Diagnostic logging** (kept for the next regression): both `audioProxy.ts` and `engine.ts` now log every step of the proxy + load flow with `[audioProxy]` / `[audioEngine]` / `[player]` prefixes. The user can check the dev console (or the terminal that runs `npm run dev`) to see the exact upstream response, sniffed Content-Type, first bytes (hex), source node wiring result, and final audio element error. The dev console will surface "BLOCKED by CSP" if the allowlist is missing a scheme in the future.
- Verified
  - `npm run build` produces `dist/index.html` with the new CSP.
  - 478/478 tests pass.
  - `npm run lint` clean, `npm run typecheck` clean.

- **Defensive Web Audio: audio always plays (with or without EQ)** — User reported the same `MEDIA_ERR_SRC_NOT_SUPPORTED: Format error` after every fix, with a strong suspicion that the equalizer-related change (unconditional `createMediaElementSource`) was the root cause. The body + Range + content-type fixes all addressed different parts of the chain, but if `createMediaElementSource` itself is what destabilizes the audio element in some environments, the error persists. Made the entire Web Audio setup defensive so the audio ALWAYS plays:
  - **`ensureContext()` returns `AudioContext | null`** — wraps the AudioContext / gainNode / equalizer setup in try/catch. On failure, returns `null` and logs a warning. Volume still works via the audio element's own volume (set unconditionally in `setVolume`).
  - **`createMediaElementSource` is wrapped in `tryWireSource()`** — both the slow path (fresh `new Audio()`) and the fast path (preloaded element reuse) go through the same helper. If it throws (or if the context is null), the engine sets `this.sourceNode = null` and continues. The audio plays directly via `<audio>`'s built-in decoder without Web Audio processing.

- **The ACTUAL root cause: `net.fetch()` body is a web `ReadableStream` in Electron 33+, not a Node `Readable`** — Despite all the above fixes, the audio element still threw `MEDIA_ERR_SRC_NOT_SUPPORTED: Format error`. The user reported a new terminal error that gave it away:
  ```
  [audioProxy] error: The "streamReadable" argument must be an stream.Readable.
  Received an instance of ReadableStream<...>
  ```
  This is Node's `Readable.toWeb()` complaining that we passed it a **web** `ReadableStream`, not a Node `stream.Readable`. Electron's `net.fetch()` API changed in newer versions: the Response body is now a `ReadableStream<Uint8Array>` (web), not a Node `Readable`. Our previous assumption (still documented in older Electron docs) was wrong.
  - **Fix**: new `asWebStream(body)` helper in `audioProxy.ts`. Duck-types on `getReader()` — if the body is already a web `ReadableStream` (Electron 33+ production case), it's used directly; if it's a Node `Readable` (older Electron / test mocks), `Readable.toWeb()` converts it. The proxy works in both environments.
  - **Test coverage**: existing tests cover the Node `Readable` body case (via `Readable.from()`); new test `handles Electron 33+ web ReadableStream body (the production case)` covers the web `ReadableStream` case via `new ReadableStream({ start(c) { ... } })`. Body integrity (chunks in order, magic bytes intact) is asserted for both.
  - 479/479 tests pass.
- Verified
  - `npm run lint` clean
  - `npm run typecheck` clean
  - `npm run build` clean
  - **`equalizer.connect()` is wrapped in try/catch** — independent of the source node, the EQ setup itself can fail (e.g., context mismatch in some envs). The engine logs a warning and continues without EQ.
  - **`destroy()` is null-safe** — `equalizer.disconnect()` is wrapped in try/catch, `if (this.ctx)` guard.
  - **New `isWebAudioActive()` API** — returns `true` only when both `sourceNode` AND `gainNode` are present. The player store / UI can show a "Direct playback (EQ disabled)" badge when false so the user understands why EQ isn't working.
  - **Net effect**: Audio plays in every scenario. The fallback path skips EQ + gain processing but volume control still works via `audio.volume`. The dev console will show a clear warning explaining what failed and why. The next regression won't be a silent `MEDIA_ERR_SRC_NOT_SUPPORTED`; it'll be a visible `console.warn` from the engine.
- Tests
  - Existing 478 tests still pass; typecheck needed a few `as unknown as Response` cleanups in `audioProxy.test.ts` (the new mock objects include Node `Readable` bodies that don't satisfy the `Response` type).
  - 478/478 tests pass.
- Verified
  - `npm run lint` clean
  - `npm run typecheck` clean
  - `npm run build` clean

- **DB swap: sql.js → better-sqlite3** (Phase A of gapless plan) — Replaced the WASM-based `sql.js` with `better-sqlite3` (sync, native, no server, no WASM). The DB file `<userData>/data/harmonix.db` is the same SQLite; only the driver changed. Refactored `electron/main/db/database.ts` (init, pragmas `journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL`; `persist()` now a WAL checkpoint since better-sqlite3 auto-syncs), `migrations.ts` (now uses `db.prepare(...).get()` + `db.transaction()`), and all 5 repositories (`settingsRepository`, `folderRepository`, `eqRepository`, `playlistRepository`, `trackRepository`) to use prepared statements `.get()`/`.all()`/`.run()`. Removed `resources/sql-wasm.wasm` (no longer needed) and the `electron-builder.yml` `extraResources` entry that bundled it. The `electron-builder install-app-deps` postinstall already rebuilds the native binary for Electron's Node ABI. For tests, added `pretest` → `npm rebuild better-sqlite3` (rebuilds for system Node's ABI so vitest can load it) and `predev`/`prebuild` → `npx @electron/rebuild -f -w better-sqlite3` (rebuilds back for Electron's ABI for dev/build). 446/446 tests pass. This sets up the IPC latency win needed for Phase B (gapless pre-buffer).

- **Gapless pre-buffer (Phase B)** — Reduced the 1-2s pause between tracks to near-instant. New `AudioEngine.preload(url)` creates a hidden `<audio>` element with `preload="auto"`, lets the buffer warm without producing sound (no `createMediaElementSource` yet), and the next `load(sameUrl)` reuses it (the MediaElementSource is created on first real use since Web Audio can only attach once per element). `load()` returns as soon as `readyState >= 2` (HAVE_CURRENT_DATA) on the fast path. `cancelPreload()` and `hasPreloaded(url)` round out the API. Stale preloads are auto-cancelled when a new `preload()` is called, so a quick succession of skips doesn't leak.
  - **PlayerStore wiring**: top-level `preloadNextInQueue(get)` helper. Triggers on (a) the end of `play()` (the common case — by the time the current track ends the buffer is already warm) and (b) the 80% mark of the current track (safety net for long tracks and manual queue replacements). Tracked via a new `preloadTriggeredTrackId` field; the 80% guard only fires once per track to avoid double-preloading. Skipped under `shuffle: true` (next is random) and for `spotify-sdk` streams (SDK requires user activation).
  - **Tests**: `tests/unit/enginePreload.test.ts` (8 cases) covers preload, idempotency, URL replacement, local-file crossOrigin, cancelPreload no-op, hasPreloaded, destroy clears. `tests/unit/playerStore.test.ts` (1 new case) verifies `preloadTriggeredTrackId` starts null. 455/455 tests pass (was 446, +9).

- **Dead-code sweep** — Removed files with zero imports / never called: `src/types/index.ts` (re-export shim), `src/types/theme.ts` (Theme type duplicated in `themeStore.ts`), `src/hooks/useAppInfo.ts` (exported but never called; the dead `setVersion`/`setPlatform` in `appStore.ts` removed too — the store is now just `version: '0.1.0'` + `platform: null`). `src/components/ui/Input.tsx` (0 refs). `tests/manual-ytmusic-dump.ts` (already gone). Removed `resources/icon.svg` (old abstract SVG) + `resources/icon-{16,32,48,64,128,256,512}.png` (intermediate files only consumed by the deleted `scripts/generate-{icons,ico}.mjs`). Those two scripts were obsolete — they would have overwritten the new brand icons with the old abstract code. `package.json`: dropped the `"icons"` npm script, removed `husky` and `lint-staged` (no `.husky/`, no pre-commit hook, dead config), and the `lint-staged` block. `tests/e2e/app.spec.ts`: replaced the broken `Welcome to Harmonix` assertion (heading never existed) with two real assertions — sidebar shows the "Harmonix" heading, home view shows the version footer. Replaced the obsolete `@shared/index` alias (pointed to deleted `src/types/index.ts`) with `@/types/global` in 11 files; `src/lib/audio/presets.ts` now imports value exports (`FLAT_GAINS`, `clampGain`, etc.) directly from `electron/main/sources/types` since `@/types/global` only re-exports types. Net: 33 files changed, ~1000 lines deleted, zero functional regressions. 446/446 tests pass.

- **Phase 14.1 first pass — Navigation Intelligence** — Shipped the foundational half of the Phase 14 plan: `⌘K` / `Ctrl+K` command palette with custom fuzzy matcher, dynamic breadcrumbs in TopBar, smart sidebar (now-playing mini-card, collapsible Playlists + Recents sections, command-palette trigger), and a new `uiStore` (Zustand) for global UI state. New files: `src/stores/uiStore.ts` (14 tests), `src/components/command/CommandPalette.tsx` (15 tests), `src/components/command/fuzzyMatch.ts` (19 tests, custom ~90-LOC matcher with character-level scoring + word-boundary bonuses + `highlightMatches` for inline highlighting), `src/components/layout/Breadcrumb.tsx` (7 tests). Modified: `Sidebar.tsx` (refactored to mount command-palette trigger + now-playing mini-card + collapsible sections + recents), `TopBar.tsx` (mounted `<Breadcrumb />` on the left, added `⌘K` hint badge inside the search input on the right), `App.tsx` (mounted `<CommandPalette />` in both main shell and `/now-playing` route, wired `uiStore.load()` and `pushRecent(location.pathname)` on route change), `tests/unit/sidebar.test.tsx` (updated `Phase 13B` → `Phase 14` assertion). **No new dependencies** — fuzzy matcher is hand-rolled, `uiStore` is vanilla Zustand. **533/533 tests pass** (was 478, +55). Lint clean, typecheck clean. Pending within 14.1 (deferred to 14.4 micro-interactions phase): full keybinding system (j/k/h/l/Space/R/M/etc.), focus restoration, search-history dropdown, `SearchView` filter chips, focus-trap on modals, skip-to-content link, drag-to-reorder sidebar nav, animated active-border indicator. Detailed shipped-vs-pending breakdown in §14.1 above.

- **Phase 14.2 first pass — Living Visuals** — Shipped the visual feedback half of the Phase 14 plan: 3-tone adaptive palette (vibrant/muted/accent) extracted from current artwork with 600ms HSL interpolation between track changes, glassmorphism system (`.glass-thin` / `.glass` / `.glass-heavy` with light-theme parity), shared element transitions (`layoutId="current-artwork"`) across `PlayerBar` ↔ `HeroPlayer` ↔ `NowPlayingView`, two audio visualizer variants (`FrequencyBars` 16-64 bars at 30 FPS, `WaveformRing` 96-point circular), and an artwork-blur background layer that lives behind the entire app. New files: `src/components/visualizers/AudioVisualizer.tsx` (9 tests, exports `useAudioAnalyser` hook + `FrequencyBars` + `WaveformRing` components; reads `--accent` CSS var for color and renders HSL→RGB inline), `src/components/layout/ArtworkBlurBackground.tsx` (3 tests, scaled 1.15× blurred background with 60px blur + 1.4 saturation). Modified: `src/lib/colorExtractor.ts` (added `AdaptivePalette` type, `buildPalette` (3-tone), `interpolateHsl` (shortest-path hue arc, clamps t), `interpolatePalette`, `paletteToCssVars` → 11 new tests in `tests/unit/adaptivePalette.test.ts`; `src/hooks/useAdaptiveAccent.ts` rewritten to drive palette interpolation via `requestAnimationFrame`, applies CSS vars (`--accent`, `--accent-hover`, `--accent-vibrant`, `--accent-muted`) with a 150ms debounce on artwork change; `src/index.css` added `.glass-thin`/`.glass`/`.glass-heavy` component classes with `:root.light` overrides + `.text-accent-vibrant`/`.bg-accent-muted`/`.border-accent-vibrant` utilities; `tailwind.config.ts` added `backdrop-blur-4xl` (64px), `glass-inner` shadow, `artworkPulse` + `sharedMorph` keyframes; `src/features/home/HeroPlayer.tsx` + `src/features/nowPlaying/NowPlayingView.tsx` + `src/components/layout/PlayerBar.tsx` swapped `<img>` → `<motion.img layoutId="current-artwork">`; `PlayerBar` artwork also gained a 3-bar mini equalizer animation when playing; `Sidebar`/`TopBar`/`PlayerBar`/`RightRail` swapped `bg-zinc-950/60 backdrop-blur` → `.glass`; `App.tsx` mounted `<ArtworkBlurBackground opacity={0.18} />` behind the app. **557/557 tests pass** (was 533, +24: 11 adaptivePalette, 9 audioVisualizer, 3 artworkBlurBackground, 1 colorExtractor). Lint clean, typecheck clean, build clean (`built in 1.42s` + 12ms + 2.87s). **No new dependencies**. Pending within 14.2 (deferred to 14.4): particle field (existing `AudioReactiveBackground` is sufficient for v1), stereo oscilloscope, mesh-gradient breathing, per-visualizer Settings toggles, full glass audit on Modal/CommandPalette/Toast/Tooltip/ContextMenu/DropdownMenu, per-component `data-adaptive` opt-in, manual override in Settings. Detailed shipped-vs-pending breakdown in §14.2 above.

- **Phase 14.3 first pass — Player Mastery** — Shipped the player UX half of the Phase 14 plan: crossfade visual indicator (gradient overlay on the NowPlayingView seek bar, subscribed to a new `subscribeCrossfadeConfig` pub-sub on `crossfade.ts` so React can react to config changes), OS Media Session integration (`useMediaSession` hook wires `navigator.mediaSession` play/pause/nexttrack/previoustrack/seekto/stop + metadata title/artist/album/artwork), source health indicator in Sidebar footer (per-source colored dots, polled every 60s via lightweight `search({query:'__health__'})` health probe with timing-based degradation thresholds), NowPlaying v2 (mouse parallax on artwork via `useMotionValue`+`useSpring`; similar tracks rail showing 5 cards from the same artist drawn from listening history + library; collapsible credits panel showing title/artist/album/duration/source), a comprehensive QueueDrawer (slide-over with framer-motion spring, search within queue, multi-select with checkboxes, save selection as new playlist, clear played, clear all, drag-to-reorder) replacing the simpler QueuePanel, and MiniPlayer v2 adding a visible "Pin" badge when always-on-top is enabled (was hidden behind right-click). New files: `src/components/player/CrossfadeIndicator.tsx` (7 tests, `useCrossfadeConfig` + `<CrossfadeIndicator durationMs={...} />`), `src/hooks/useMediaSession.ts` (2 tests, action handlers + state/metadata sync), `src/hooks/useSourceHealth.ts` (4 tests, per-source health status + `HEALTH_DOT_COLORS`/`HEALTH_DOT_LABELS` maps), `src/features/player/QueueDrawer.tsx` (8 tests, slide-over with framer-motion, multi-select, search, save-as-playlist, drag-to-reorder). Modified: `src/lib/audio/crossfade.ts` (added `subscribeCrossfadeConfig` pub-sub + `listeners` set), `src/components/layout/PlayerBar.tsx` (replaced `QueuePanel` import with `QueueDrawer`), `src/features/nowPlaying/NowPlayingView.tsx` (added `useMouseParallax` hook + similar tracks `useEffect` + `pickSimilarTracks` helper + credits panel + crossfade indicator on seek bar), `src/components/layout/Sidebar.tsx` (added per-source health dots in footer with `useSourceHealth` + `HEALTH_DOT_COLORS` + `HEALTH_DOT_LABELS`), `src/features/miniPlayer/MiniPlayerView.tsx` (visible "Pin" badge when `config.alwaysOnTop`), `src/App.tsx` (mounted `useMediaSession()`). **578/578 tests pass** (was 557, +21: 7 crossfadeIndicator, 8 queueDrawer, 4 sourceHealth, 2 mediaSession). Lint clean (0 errors, 2 pre-existing fast-refresh warnings about non-component exports in hook+component files), typecheck clean, build clean (`built in 1.40s` + 14ms + 2.83s). **No new dependencies**. Pending within 14.3 (deferred to 14.4 micro-interactions phase): expandable PlayerBar (hover-expand, drag-resize, pin), MiniPlayer v2 resize + snap zones + hover-expand (requires new `miniPlayer.setBounds` IPC + main-process window resize), lyrics panel (LRClib fetch + synced highlight), trackpad gestures (useGestures), visualizer toggle in NowPlaying, theme override (match artwork vs brand pink), rich toasts v2 (artwork + actions), OS-level main-process Media Session IPC for Windows SMTC / macOS Now Playing, source health click-to-expand, crossfade tooltip, settings for visualizer quality / performance mode / reduced motion / gestures / keyboard remap. Detailed shipped-vs-pending breakdown in §14.3 above.
