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

See [Section 8](#8-backlog--future-ideas).

---

## 5. Milestones

| Milestone                                                                            | Target             | Status         |
| ------------------------------------------------------------------------------------ | ------------------ | -------------- |
| M0: Project scaffolded                                                               | Phase 0 complete   | ✅ Done        |
| M1: Local playback works                                                             | Phase 1 complete   | ✅ Done        |
| M2: Plugin architecture ready                                                        | Phase 2 complete   | ✅ Done        |
| M3: Spotify integration                                                              | Phase 3 complete   | ✅ Done        |
| M4: YouTube Music integration                                                        | Phase 4 complete   | ✅ Done        |
| M5: Playlists & queue                                                                | Phase 5 complete   | ✅ Done        |
| M6: EQ & effects                                                                     | Phase 6 complete   | ✅ Done        |
| M7: First public release                                                             | Phase 7 complete   | 🔜 In Progress |
| M8: Additional sources (Deezer/Jamendo/Audius/SoundCloud)                            | Phase 8 complete   | ✅ Done        |
| M9: UI integration (per-source views, sidebar, player source badge, config UI)       | Phase 9 complete   | ✅ Done        |
| M10: Mini-player mode (compact floating window + system tray)                        | Phase 10 complete  | ✅ Done        |
| M11: AI-powered playlist generation (LLM + source search)                            | Phase 11 complete  | 🔜 Planned     |
| M12: UI/UX polish (navigation, controls, micro-interactions, dark theme)             | Phase 12 complete  | ✅ Done        |
| M13: Visual immersion (palette refactor, glassmorphism, audio-reactive, now-playing) | Phase 13A complete | ✅ Done        |
| M14: Layout redesign (3-column shell, pink palette, hero player, right rail)         | Phase 13B complete | ✅ Done        |

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
- [x] ~~Mini-player mode~~ (shipped in Phase 10)
- [x] ~~UI/UX polish (Interface Refinement)~~ (shipped in Phase 12)
- [x] ~~Visual immersion (palette refactor, audio-reactive background, Now Playing)~~ (shipped in Phase 13A)
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

## 10. Progress Log (active session) — continued

- **Sources section removed (UI cleanup)** — Per user feedback referencing `docs/perbaiki-nanti/`: Sidebar no longer renders the per-source "Sources" sub-nav, and HomeView no longer renders the "Sources" quick-access grid. Source management stays exclusively in Settings → SourcePicker. Footer still shows enabled source count for transparency.
- **Home: For You recommendations** — `src/features/home/HomeView.tsx` now embeds a 6-card responsive "For You" grid directly below the hero player. New users see 2 starter cards (Browse Library, Search) with a prompt to play tracks.
- **Unified search** — Verified the global TopBar search is the single entry point: types in the top search bar navigate to `/search?q=…` which fans out across all enabled sources (`SearchView` already uses `sourcesStore.search`). No source-specific search boxes remain in the main window.
- **ForYouSection extracted** — New `src/components/recommendations/ForYouSection.tsx` is the single source of truth for "For You" rendering. Used by Home (grid, 6 items, with header) and RightRail (list, 3 items, headerless). Props: `limit`, `layout: 'grid' | 'list'`, `onPlayHistoryEntry`, `showHeader`, `emptyAction`. Plays via `usePlayerStore.play` by default, or delegates to `onPlayHistoryEntry` if provided.
- **Tests** — `tests/unit/forYouSection.test.tsx` (8 cases) covers starter/history toggle, limit, showHeader, grid+list layouts, data-testid, and entry rendering. `tests/unit/sidebar.test.tsx` updated: removed 3 sub-section tests, replaced with 1 negative assertion that the "Sources" sub-nav is not rendered. `tests/unit/rightRail.test.tsx`: 1 test updated to expect only "Up Next" (the For You heading moved to Home).
- **Verified** — `npm run lint` ✅, `npm run typecheck` ✅, `npm run test` ✅ (433/433, was 427, +6).

---

**Last updated**: Phase 12 (UI/UX Polish), Phase 13A (Visual Immersion), and Phase 13B (Soundora-inspired Layout Redesign) shipped. Phase 11 (AI-Powered Playlist Generation) still planned. 446 tests passing.
