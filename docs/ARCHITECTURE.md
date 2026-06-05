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
├── ipc/                     # IPC handlers (one file per domain)
│   ├── library.ts           # Library scan/refresh requests
│   ├── search.ts            # Cross-source search
│   ├── player.ts            # Playback control (delegates to renderer)
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
├── App.tsx                  # Root component
├── main.tsx                 # React entry point
├── components/              # Reusable UI components
│   ├── ui/                  # Generic (Button, Input, etc.)
│   └── layout/              # App shell (Sidebar, PlayerBar, etc.)
├── features/                # Feature modules
│   ├── library/             # Local library views
│   ├── search/              # Unified search
│   ├── playlist/            # Playlist management
│   ├── player/              # Player UI
│   └── settings/            # Settings page
├── stores/                  # Zustand stores
│   ├── playerStore.ts       # Current track, queue, playback state
│   ├── libraryStore.ts      # Local library cache
│   ├── authStore.ts         # OAuth tokens & user info
│   └── settingsStore.ts     # User preferences
├── hooks/                   # Custom React hooks
├── lib/                     # Core libraries
│   ├── audio/               # Web Audio engine
│   │   ├── engine.ts        # Playback engine
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
  id: string;                    // Unique within source
  source: 'spotify' | 'ytmusic' | 'local' | string;
  sourceId: string;              // Original ID from source
  title: string;
  artists: Artist[];
  album?: Album;
  durationMs: number;
  artworkUrl?: string;
  isrc?: string;                 // International Standard Recording Code
  externalUrl?: string;          // Link to source (for credits)
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
  url: string;                   // Direct stream URL or special protocol
  protocol: 'http' | 'file' | 'spotify-sdk' | 'youtube';
  expiresAt?: number;            // For time-limited URLs
  requiresProxy?: boolean;       // If main process must proxy the stream
}
```

For full interface definitions, see [`electron/main/sources/types.ts`](../electron/main/sources/types.ts).

---

## 6. State Management

We use **Zustand** for client-side state. Stores are organized by domain:

| Store | Purpose | Persistence |
|---|---|---|
| `playerStore` | Current track, queue, playback state, EQ settings | LocalStorage (EQ only) |
| `libraryStore` | Cached local library (tracks, albums, artists) | SQLite (via main) |
| `authStore` | OAuth tokens, user profiles per source | Encrypted via `safeStorage` |
| `settingsStore` | User preferences (theme, hotkeys, etc.) | LocalStorage + SQLite |

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

## Further Reading

- [`PLANNING.md`](PLANNING.md) — Roadmap and phases
- [`SOURCES.md`](SOURCES.md) — How to add a new source
- [`docs/ADR/`](ADR/) — Architecture Decision Records
