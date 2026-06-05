# Harmonix — Architecture

> **Purpose**: This document describes how Harmonix is built. It complements [`PLANNING.md`](PLANNING.md) (the "what" and "when") by explaining the "how".

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Process Model](#2-process-model)
3. [Module Structure](#3-module-structure)
4. [Data Flow](#4-data-flow)
5. [Core Interfaces](#5-core-interfaces)
6. [State Management](#6-state-management)
7. [Audio Architecture](#7-audio-architecture)
8. [IPC Contract](#8-ipc-contract)
9. [Security Model](#9-security-model)
10. [Database Schema](#10-database-schema)

---

## 1. High-Level Overview

Harmonix follows a standard Electron architecture with a clear separation between the main process (Node.js, full system access) and the renderer process (Chromium, sandboxed UI).

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer (React)                      │
│  ┌──────────┬──────────┬──────────┬──────────────────┐  │
│  │ Library  │  Search  │ Playlist │  Player + Queue  │  │
│  └──────────┴──────────┴──────────┴──────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Zustand stores: player / library / queue / auth    ││
│  └─────────────────────────────────────────────────────┘│
└───────────────────┬─────────────────────────────────────┘
                    │ IPC (contextBridge)
┌───────────────────▼─────────────────────────────────────┐
│                     Main Process                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Source Adapters (plugin system)          │ │
│  │  Spotify  │ YouTube │ Local │ (Deezer) │ (Audius)  │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌──────────┬──────────┬───────────┬──────────────────┐│
│  │ SQLite   │ OAuth    │ yt-dlp    │ File watcher     ││
│  │ cache    │ server   │ runner    │ (chokidar)       ││
│  └──────────┴──────────┴───────────┴──────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## 2. Process Model

### Main Process (`electron/main/`)

- **Runs**: Node.js with full system access
- **Responsibilities**:
  - Window management
  - Source adapters (network calls, file system, external processes)
  - OAuth flows
  - SQLite database
  - IPC handlers
  - Native integrations (file dialogs, notifications, etc.)

### Preload Script (`electron/preload/`)

- **Runs**: Isolated context with access to both Node and DOM
- **Responsibilities**:
  - Expose a safe API to the renderer via `contextBridge`
  - Whitelist specific IPC channels
  - **Never** expose Node APIs directly

### Renderer Process (`src/`)

- **Runs**: Sandboxed Chromium with React
- **Responsibilities**:
  - UI rendering
  - User interactions
  - Client-side state (Zustand)
  - Audio playback (Web Audio API, `<audio>` element, Spotify Web Playback SDK)

---

## 3. Module Structure

```
electron/main/
├── index.ts                 # Entry point: app lifecycle, window creation
├── windowManager.ts         # MainWindow + MiniPlayerWindow factories
├── tray.ts                  # System tray icon + context menu
├── playerState.ts           # In-memory player state mirror + reducer
├── windowBounds.ts          # Pure clampToDisplayBounds() (unit-testable)
├── ipc/                     # IPC handlers (one file per domain)
│   ├── library.ts           # Library scan/refresh requests
│   ├── search.ts            # Cross-source search
│   ├── player.ts            # Player state push / command routing
│   ├── miniPlayer.ts        # mini-player:show / hide / toggle / set-always-on-top
│   ├── auth.ts              # OAuth flows
│   └── settings.ts          # User preferences
├── sources/                 # MusicSource adapters
│   ├── types.ts             # MusicSource interface, Track, Album, Playlist
│   ├── registry.ts          # Source registration & lookup
│   ├── spotify/
│   │   ├── index.ts         # SpotifySource class
│   │   ├── auth.ts          # OAuth PKCE
│   │   └── api.ts           # Spotify Web API client
│   ├── ytmusic/
│   │   ├── index.ts         # YouTubeMusicSource class
│   │   └── ytdlp.ts         # yt-dlp subprocess wrapper
│   └── local/
│       ├── index.ts         # LocalSource class
│       ├── scanner.ts       # File system scanner
│       └── metadata.ts      # Tag extraction
├── db/                      # SQLite layer
│   ├── index.ts             # Database connection
│   ├── migrations/          # Schema migrations
│   └── repositories/        # Data access objects
└── auth/                    # Shared auth utilities
    └── pkce.ts              # PKCE code generation
```

```
src/
├── App.tsx                  # Root component (detects mini mode via window.api.miniPlayer.isMini())
├── main.tsx                 # React entry point
├── components/              # Reusable UI components
│   ├── ui/                  # Generic (Button, Input, etc.)
│   └── layout/              # App shell (Sidebar, PlayerBar, etc.)
├── features/                # Feature modules
│   ├── library/             # Local library views
│   ├── search/              # Unified search
│   ├── playlist/            # Playlist management
│   ├── player/              # Player UI
│   ├── miniPlayer/          # Mini-player React surface (rendered when route is /mini)
│   │   └── MiniPlayerView.tsx
│   └── settings/            # Settings page
├── stores/                  # Zustand stores
│   ├── playerStore.ts       # Current track, queue, playback state
│   ├── libraryStore.ts      # Local library cache
│   ├── authStore.ts         # OAuth tokens & user info
│   └── settingsStore.ts     # User preferences
├── hooks/                   # Custom React hooks
│   ├── usePlayerStateSync.ts # Pushes playerStore -> main -> mini player IPC
│   └── useKeyboardShortcuts.ts # Includes Ctrl/Cmd+Shift+M for mini-player toggle
├── lib/                     # Core libraries
│   ├── audio/               # Web Audio engine (main renderer only)
│   │   ├── engine.ts        # Playback engine (audio engine lives in main window)
│   │   ├── equalizer.ts     # 10-band EQ
│   │   └── source-resolver.ts # Route play requests to correct source
│   └── api/                 # Wrappers around preload API
└── types/                   # Shared TypeScript types
```

---

## 4. Data Flow

### Example: User searches for a track

```
[User types in SearchBar]
         │
         ▼
[React component] dispatches search(query)
         │
         ▼
[preload.search(query)] → IPC invoke 'search:query'
         │
         ▼
[Main: search.ts] iterates registered sources
         │
         ├──> SpotifySource.search(query) → fetch API
         ├──> YouTubeMusicSource.search(query) → youtubei.js
         └──> LocalSource.search(query) → SQLite query
         │
         ▼
[Main: aggregate results] → UnifiedSearchResult[]
         │
         ▼
[preload] returns to renderer
         │
         ▼
[React] updates SearchResults component
```

### Example: User plays a track

```
[User clicks Play on a Track]
         │
         ▼
[React] calls playerStore.play(track)
         │
         ▼
[audio/source-resolver.ts] inspects track.source
         │
         ├──> 'spotify' → Spotify Web Playback SDK
         ├──> 'ytmusic' → resolve stream URL via main → HTML5 audio
         └──> 'local' → read file → HTML5 audio
         │
         ▼
[audio/engine.ts] sets up Web Audio graph
         │
         ▼
[EQ chain] (if enabled) → BiquadFilters → destination
         │
         ▼
[Audio plays]
```

---

## 5. Core Interfaces

### `Track` (shared type)

```typescript
interface Track {
  id: string; // Unique within source
  source: 'spotify' | 'ytmusic' | 'local' | string;
  sourceId: string; // Original ID from source
  title: string;
  artists: Artist[];
  album?: Album;
  durationMs: number;
  artworkUrl?: string;
  isrc?: string; // International Standard Recording Code
  externalUrl?: string; // Link to source (for credits)
  isPlayable: boolean;
  // Source-specific data (opaque to core)
  meta?: Record<string, unknown>;
}
```

### `MusicSource` (adapter interface)

```typescript
interface MusicSource {
  readonly id: string;
  readonly name: string;
  readonly requiresAuth: boolean;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Search
  search(query: string, options?: SearchOptions): Promise<SearchResult>;

  // Track operations
  getTrack(trackId: string): Promise<Track | null>;
  getStreamUrl(track: Track): Promise<StreamInfo>;

  // Playlists
  getPlaylist(playlistId: string): Promise<Playlist | null>;
  getUserPlaylists(): Promise<Playlist[]>;

  // Library (optional)
  getLikedTracks?(): Promise<Track[]>;
  getSavedAlbums?(): Promise<Album[]>;
}
```

### `StreamInfo`

```typescript
interface StreamInfo {
  url: string; // Direct stream URL or special protocol
  protocol: 'http' | 'file' | 'spotify-sdk' | 'youtube';
  expiresAt?: number; // For time-limited URLs
  requiresProxy?: boolean; // If main process must proxy the stream
}
```

For full interface definitions, see [`electron/main/sources/types.ts`](../electron/main/sources/types.ts).

---

## 6. State Management

We use **Zustand** for client-side state. Stores are organized by domain:

| Store           | Purpose                                           | Persistence                 |
| --------------- | ------------------------------------------------- | --------------------------- |
| `playerStore`   | Current track, queue, playback state, EQ settings | LocalStorage (EQ only)      |
| `libraryStore`  | Cached local library (tracks, albums, artists)    | SQLite (via main)           |
| `authStore`     | OAuth tokens, user profiles per source            | Encrypted via `safeStorage` |
| `settingsStore` | User preferences (theme, hotkeys, etc.)           | LocalStorage + SQLite       |

**Why Zustand?**

- Minimal boilerplate vs. Redux
- No provider hell
- Easy to test
- Good TypeScript support

---

## 7. Audio Architecture

### Web Audio API Graph

```
[Source: HTMLAudioElement | MediaElementSource]
                    │
                    ▼
            [MediaElementSource]
                    │
                    ▼
    [BiquadFilter 1: 32 Hz]   ← 10-band EQ
                    │
                    ▼
    [BiquadFilter 2: 64 Hz]
                    │
                    ▼
              [... 8 more ...]
                    │
                    ▼
    [BiquadFilter 10: 16 kHz]
                    │
                    ▼
            [GainNode: volume]
                    │
                    ▼
        [AudioContext.destination]
```

### Spotify Limitation

Spotify Web Playback SDK **does not expose raw audio**. It plays through a sandboxed `<iframe>` and we cannot tap into the audio graph. Therefore:

- **EQ works for**: Local files, YouTube Music
- **EQ does NOT work for**: Spotify (limitation of SDK)

This is documented in the UI with a tooltip.

### Loudness Normalization

Optional ReplayGain support is planned for Phase 8+. See [`PLANNING.md`](PLANNING.md) backlog.

---

## 8. IPC Contract

All renderer ↔ main communication goes through a **whitelisted contextBridge API** defined in [`electron/preload/index.ts`](../electron/preload/index.ts).

### Channel Naming Convention

- `domain:action` (e.g., `library:scan`, `search:query`, `auth:spotify:login`)

### Example API Surface

```typescript
window.api = {
  library: {
    scanFolder(): Promise<ScanResult>,
    getTracks(): Promise<Track[]>,
    refresh(): Promise<void>,
  },
  search: {
    query(q: string, sources?: string[]): Promise<SearchResult>,
  },
  player: {
    resolveStream(track: Track): Promise<StreamInfo>,
  },
  auth: {
    spotify: {
      login(): Promise<void>,
      logout(): Promise<void>,
      getStatus(): Promise<AuthStatus>,
    },
  },
  settings: {
    get<T>(key: string): Promise<T>,
    set<T>(key: string, value: T): Promise<void>,
  },
};
```

---

## 9. Security Model

### Principles

1. **`contextIsolation: true`** — Renderer cannot access Node APIs directly.
2. **`nodeIntegration: false`** — No `require()` in renderer.
3. **`sandbox: true`** where possible — Renderer runs in OS-level sandbox.
4. **Whitelist IPC** — Only specific channels are exposed via `contextBridge`.
5. **CSP** — Strict Content Security Policy in production.
6. **No remote module** — Deprecated and disabled.

### OAuth Token Storage

- Tokens are stored via Electron's `safeStorage` API (OS-level encryption).
- On macOS: Keychain
- On Windows: DPAPI
- On Linux: libsecret

### External Content

- All external URLs open in the user's default browser (`shell.openExternal`), never in the app.
- Spotify Web Playback SDK loads in a sandboxed `<iframe>`.

---

## 10. Database Schema

SQLite (via `sql.js` for cross-platform builds without native compilation; can be swapped to `better-sqlite3` for production with native deps) is used for:

- **Local library index** (file paths, metadata)
- **User playlists** (cross-source)
- **Cached search results** (optional, TTL-based)
- **Settings** (non-sensitive)

### Schema (planned, Phase 1+)

```sql
-- Local library
CREATE TABLE tracks (
  id INTEGER PRIMARY KEY,
  file_path TEXT UNIQUE NOT NULL,
  title TEXT,
  artist TEXT,
  album TEXT,
  duration_ms INTEGER,
  bitrate INTEGER,
  sample_rate INTEGER,
  artwork_path TEXT,
  added_at INTEGER,
  last_played_at INTEGER,
  play_count INTEGER DEFAULT 0
);

CREATE TABLE albums (...);
CREATE TABLE artists (...);

-- User playlists
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE playlist_tracks (
  playlist_id INTEGER,
  position INTEGER,
  track_source TEXT,
  track_source_id TEXT,
  PRIMARY KEY (playlist_id, position)
);

-- Settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

Migrations are managed via a simple versioned migration system (no ORM).

---

## 11. Mini-Player Window (Phase 10)

The mini-player is a **second, frameless `BrowserWindow`** (default 360×120) that floats above other apps. It is **read-only** for audio: only the main renderer creates the `AudioContext` and `MediaElementSourceNode`. The mini-player drives the main renderer through IPC commands and receives pushed state.

### State Sync Flow

```
┌──────────────┐  player:push-state  ┌────────────┐  player:state-changed  ┌────────────┐
│  Main        │ ──────────────────▶ │   Main     │ ────────────────────▶ │  Mini      │
│  renderer    │                     │  process   │                       │  renderer  │
│  (owns audio)│ ◀─── player:command │ (bus)      │                       │  (UI only) │
└──────────────┘                     └────────────┘                       └────────────┘
```

1. The main renderer subscribes to its own `usePlayerStore` and pushes a normalized `MiniPlayerStateSnapshot` to the main process via `player:push-state` whenever the snapshot fingerprint changes.
2. The main process keeps the latest snapshot in `playerStateBus` and broadcasts it to **all** renderer windows (main + mini) via `player:state-changed`.
3. The mini renderer hydrates from `player:get-state` on mount and renders against the latest push.
4. When the user clicks play/pause/next in the mini, the mini sends a `player:command` action to the main process, which forwards it to the main renderer's `webContents` via `player:command`. The main renderer's `usePlayerStateSync.onCommand` handler dispatches the equivalent action on the local `usePlayerStore`.

### Components

- `electron/main/windowManager.ts` — `createMainWindow()` (extracted from the previous inline definition in `index.ts`) and `createMiniPlayerWindow()`. The mini-player is frameless, `skipTaskbar: true`, `alwaysOnTop` toggleable, hide-on-close (do not destroy on `close` unless the user is quitting).
- `electron/main/windowBounds.ts` — pure `clampToDisplayBounds(x, y, w, h, workArea)` used to keep the window on screen even after a monitor disconnect. Unit-tested in `tests/unit/windowBounds.test.ts`.
- `electron/main/playerState.ts` — in-memory `PlayerStateBus` + pure reducer `applyPlayerAction(snapshot, action)`. Unit-tested in `tests/unit/playerState.test.ts`.
- `electron/main/tray.ts` — system tray icon with right-click menu (Show main, Show/Hide mini-player, Quit). Menu is rebuilt every second so the Show/Hide label stays accurate.
- `electron/main/ipc/player.ts` — `player:get-state`, `player:push-state`, `player:command` handlers.
- `electron/main/ipc/miniPlayer.ts` — `mini-player:show/hide/toggle/status/set-always-on-top/expand/save-bounds/close-window`. Persists `window.miniPlayer.{x,y,width,height,alwaysOnTop}` in the `settings` table.
- `src/hooks/usePlayerStateSync.ts` — subscribes to `usePlayerStore` in the main renderer, pushes snapshots, and routes incoming mini-commands back into the local store. Mounted in `<MainApp />` only.
- `src/features/miniPlayer/MiniPlayerView.tsx` — the mini UI: artwork, title, artist, source badge, transport buttons, clickable progress bar, "expand to full" and "hide" buttons, right-click context menu with "Always on top" toggle.
- `src/App.tsx` — detects mini mode via `window.api.miniPlayer.isMini()` (checks `location.hash === '#/mini'`) and renders only `<MiniPlayerView />`. Otherwise renders the full app with `<PlayerBar />` (now includes a "minimize to mini" button) and the existing keyboard-shortcut layer (`Ctrl/Cmd+Shift+M` toggles the mini).

### Audio Ownership

Only the main renderer instantiates an `AudioContext`. The mini renderer must never import `@/lib/audio/engine` or anything that creates `AudioContext`/`MediaElementSourceNode`. The mini surface is purely visual; all audio decisions flow back to the main renderer.

---

## Further Reading

- [`PLANNING.md`](PLANNING.md) — Roadmap and phases
- [`SOURCES.md`](SOURCES.md) — How to add a new source
- [`docs/ADR/`](ADR/) — Architecture Decision Records
