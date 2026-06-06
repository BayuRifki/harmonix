# Harmonix — Adding a New Music Source

> **Purpose**: This guide explains how to add a new music source to Harmonix. By following these steps, you can integrate any service that provides music (Deezer, Jamendo, Audius, podcast RSS, etc.) without modifying the core app.

---

## Table of Contents

1. [Overview](#1-overview)
2. [The `MusicSource` Interface](#2-the-musicsource-interface)
3. [Step-by-Step Guide](#3-step-by-step-guide)
4. [Example: A Minimal Source](#4-example-a-minimal-source)
5. [Authentication](#5-authentication)
6. [Streaming](#6-streaming)
7. [Testing Your Source](#7-testing-your-source)
8. [Submitting a PR](#8-submitting-a-pr)

---

## 1. Overview

Every source in Harmonix implements the `MusicSource` interface. This makes sources **pluggable**: the core app doesn't care if a track came from Spotify or a local file — it just calls the same methods.

```
electron/main/sources/
├── types.ts          # Interfaces (read this first)
├── registry.ts       # Source registration
├── spotify/          # Example: complex source with auth
├── ytmusic/          # Example: source that ships a bundled CLI binary
├── local/            # Example: file-system based source
└── yoursource/       # ← You'll create this
    ├── index.ts
    ├── auth.ts       # (optional)
    └── client.ts     # (optional)
```

---

## 2. The `SourceAdapter` Base Class

> See [`electron/main/sources/adapter.ts`](../../electron/main/sources/adapter.ts) for the canonical definition.

```typescript
abstract class SourceAdapter implements MusicSource {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly capabilities: SourceCapabilities;

  // Lifecycle (you must implement)
  abstract initialize(): Promise<void>;
  abstract shutdown(): Promise<void>;

  // Capability-gated defaults — override only what you support
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  getTrack(trackId: string): Promise<Track | null>;
  getStreamUrl(track: Track): Promise<StreamInfo>;
  getPlaylist(playlistId: string): Promise<Playlist | null>;
  getUserPlaylists(): Promise<Playlist[]>;
  getPlaylistTracks(playlistId: string): Promise<Track[]>;
  getLikedTracks(): Promise<Track[]>;
  getSavedAlbums(): Promise<Album[]>;
  isAuthenticated(): Promise<boolean>;
  getAuthStatus(): Promise<AuthStatus>;

  // Config & enable/disable
  setConfig(config: Partial<SourceAdapterConfig>): void;
  getConfig(): SourceAdapterConfig;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
}
```

### Capabilities

Declare what your source supports via `capabilities`:

```typescript
interface SourceCapabilities {
  canSearch: boolean; // Does it support search?
  canStream: boolean; // Can it produce stream URLs?
  canGetPlaylists: boolean; // Does it have user playlists?
  canGetLikedTracks: boolean; // Liked/saved tracks?
  requiresAuth: boolean; // Needs user authentication?
  supportsFileStreaming: boolean; // file:// URLs?
  supportsRemoteStreaming: boolean; // http(s) URLs?
  supportsPlaylists: boolean;
}
```

Capability-gated methods will throw a clear error if called when the capability is `false`. This prevents silent failures.

---

## 3. Step-by-Step Guide

### Step 1: Create the source directory

```bash
mkdir electron/main/sources/yoursource
```

### Step 2: Create the source class

Create `electron/main/sources/yoursource/index.ts`:

```typescript
import type { MusicSource, Track, SearchResult, StreamInfo } from '../types';

export class YourSource implements MusicSource {
  readonly id = 'yoursource';
  readonly name = 'Your Source';
  readonly requiresAuth = false; // Set to true if auth is needed

  async initialize(): Promise<void> {
    // Setup: load config, test connection, etc.
  }

  async shutdown(): Promise<void> {
    // Cleanup: close connections, clear caches
  }

  async search(query: string): Promise<SearchResult> {
    // Implement search logic
    return { tracks: [], albums: [], artists: [], playlists: [] };
  }

  async getTrack(trackId: string): Promise<Track | null> {
    // Fetch a single track by ID
    return null;
  }

  async getStreamUrl(track: Track): Promise<StreamInfo> {
    // Return a playable URL or special protocol
    return { url: '', protocol: 'http' };
  }
}
```

### Step 3: Register the source

Edit `electron/main/sources/registry.ts`:

```typescript
import { YourSource } from './yoursource';

export function createSources(): MusicSource[] {
  return [
    new LocalSource(),
    new SpotifySource(),
    new YouTubeMusicSource(),
    new YourSource(), // ← Add this
  ];
}
```

### Step 4: Update the source list in the UI

The UI reads the registered sources automatically. No changes needed unless you want to add source-specific UI (e.g., a login button).

### Step 5: Add configuration (if needed)

If your source requires API keys, add them to `.env.example` and document them in the README.

---

## 4. Example: A Minimal Source

Here's a complete example of a tiny source using the new `SourceAdapter` base class. The full reference implementation is at [`electron/main/sources/demo/index.ts`](../../electron/main/sources/demo/index.ts).

```typescript
// electron/main/sources/mysource/index.ts
import { SourceAdapter, type SourceCapabilities } from '../adapter';
import type { Track, SearchResult, SearchOptions, StreamInfo } from '../types';

const CAPS: SourceCapabilities = {
  canSearch: true,
  canStream: true,
  canGetPlaylists: false,
  canGetLikedTracks: false,
  requiresAuth: false,
  supportsFileStreaming: false,
  supportsRemoteStreaming: true,
  supportsPlaylists: false,
};

export class MySource extends SourceAdapter {
  readonly id = 'mysource';
  readonly name = 'My Source';
  readonly capabilities: SourceCapabilities = CAPS;

  override async initialize(): Promise<void> {}
  override async shutdown(): Promise<void> {}

  override async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    // ... your search logic
    return { tracks: [], albums: [], artists: [], playlists: [] };
  }

  override async getStreamUrl(track: Track): Promise<StreamInfo> {
    return { url: 'https://example.com/audio.mp3', protocol: 'http' };
  }
}
```

Then register it in [`electron/main/index.ts`](../../electron/main/index.ts):

```typescript
import { MySource } from './sources/mysource';
// ...
registerSource(new MySource());
```

That's it. Your source will now:

- Appear in the **Settings → Music Sources** panel
- Be toggleable on/off (state persists in SQLite)
- Participate in **unified search**
- Be selectable in the **Library → Source filter**
- Stream tracks through the unified `playTrack` IPC

---

## 5. Authentication

If your source requires authentication (OAuth, API keys, etc.):

1. Add a `login()` and `logout()` method to your source class.
2. Use Electron's `safeStorage` to store tokens securely.
3. Expose login/logout via the IPC API (see [`docs/ARCHITECTURE.md`](ARCHITECTURE.md#8-ipc-contract)).
4. Add a login button in the settings UI.

Example skeleton:

```typescript
async login(): Promise<void> {
  // Open OAuth flow or prompt for API key
  const token = await this.performOAuth();
  await this.storeToken(token);
}

async logout(): Promise<void> {
  await this.clearToken();
}

private async storeToken(token: string): Promise<void> {
  const safeStorage = require('electron').safeStorage;
  const encrypted = safeStorage.encryptString(token);
  // Save encrypted buffer to disk or settings DB
}
```

For OAuth PKCE flows, see the Spotify source for a complete reference implementation (coming in Phase 3).

---

## 6. Streaming

The `getStreamUrl` method should return a `StreamInfo` object. The protocol field tells the audio engine how to handle the stream:

| Protocol        | Description                             | Example             |
| --------------- | --------------------------------------- | ------------------- |
| `'http'`        | Direct HTTP URL, played via `<audio>`   | Direct MP3 link     |
| `'file'`        | Local file path                         | `C:/music/song.mp3` |
| `'spotify-sdk'` | Handled by Spotify Web Playback SDK     | Spotify tracks      |
| `'youtube'`     | YouTube video ID, resolved via `yt-dlp` | YouTube Music       |

> **Bundled binary note**: The YouTube Music source ships its own CLI dependency (`yt-dlp.exe`) inside `resources/yt-dlp.exe` (Windows). The adapter looks there first via `ytdlp.ts:candidates()`, falls back to `YT_DLP_PATH` env var, then `yt-dlp` on `PATH`. To refresh the bundled binary, run `yt-dlp -U` (Settings → YouTube Music → "Check for update") and commit the updated `resources/yt-dlp.exe`. See `docs/PLANNING.md` §10 for the design rationale.

If your source requires **proxying** (e.g., to add authentication headers), set `requiresProxy: true` and the main process will stream the audio to the renderer.

---

## 7. Testing Your Source

1. **Unit tests**: Test the `search` and `getTrack` methods with mocked HTTP responses.
2. **Integration test**: Manually verify in dev mode:
   ```bash
   npm run dev
   ```
3. **Type check**: Ensure your source implements the interface correctly:
   ```bash
   npm run typecheck
   ```

Add tests in `tests/sources/yoursource.test.ts`.

---

## 8. Submitting a PR

When you're ready to contribute your source:

1. Read [`docs/CONTRIBUTING.md`](CONTRIBUTING.md).
2. Open an issue first to discuss the source (some sources have legal implications).
3. Create a feature branch: `feature/source-yoursource`
4. Add documentation in `docs/SOURCES.md` if your source has unique setup steps.
5. Add a `.env.example` entry if config is needed.
6. Submit a PR with:
   - The source implementation
   - Tests
   - Updated `.env.example` (if applicable)
   - Updated `docs/SOURCES.md`

---

## Need Help?

- Check existing sources for patterns (Spotify, YouTube Music, Local)
- Read the [`MusicSource` interface](../../electron/main/sources/types.ts)
- Open a [GitHub Discussion](../../discussions)
