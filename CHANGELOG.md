# Changelog

All notable changes to Harmonix will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Spotify audio-features API integration** — `getAudioFeatures(trackIds)` on the Spotify client, exposed to the renderer as `window.api.auth.spotifyAudioFeatures(trackIds)` (IPC chunks the input into Spotify's 100-id-per-request batches). Returns a `Map<trackId, features>` covering danceability, energy, valence, tempo, acousticness, instrumentalness, speechiness, liveness. Skips gracefully on any failure (no auth, rate-limited, malformed response) so callers can degrade.
- **"Personal" signal in the hybrid recommender** — the user's top-played tracks (from the local listening-history store) are synthesised into `Track` objects and injected as a 4th signal into `mergeRecommendations`. Default weight 0.15 (low enough to bias without overriding the search-based signals). Helps the "For You" rail surface trusted tracks even when the content / session / history search signals miss them.
- **Audio-similarity re-ranking pass** — `cosineSimilarity(a, b)` + `rerankByAudioSimilarity(tracks, featuresMap, currentFeatures, weight)` in `src/lib/recommender/scoring.ts`. `useHybridRecommendations` now calls a new `maybeRerankByAudioFeatures` after the merge that boosts Spotify recommendations whose danceability / energy / valence / tempo are close to the current track. No-ops cleanly when the user isn't on Spotify or isn't authenticated. Default weight 0.3.
- **NSIS installer for Windows** — `npm run dist:win` now produces a working `Harmonix-0.1.0-x64-Setup.exe` (~110 MB) that bundles the Electron app, `yt-dlp.exe` for YT Music streaming, and installs via the standard NSIS wizard (start menu + desktop shortcuts, configurable install dir, uninstaller). The release CI workflow (`.github/workflows/release.yml`) already builds installers for all three platforms in parallel on tagged releases.
- **Stronger artist-diversity algorithm** — replaced the old "head+tail" demote-overflow with a two-phase greedy slot-by-slot interleaving. Phase 1 fills positions with the highest-scoring track whose artist hasn't hit the cap; phase 2 round-robins overflow by artist so the deferred portion still has some variety. The 6-artist / 1-per-artist integration test now actually achieves 1-Coldplay-in-top-6 (was 5).

### Changed

- **`dist:all` script** bumped from `-mw` to `-mwl` so a single command produces installers for macOS, Windows, and Linux instead of just Mac + Windows.
- `electron-builder.yml`:
  - `win.signAndEditExecutable: false` — winCodeSign tries to extract darwin dylib symlinks which Windows can't create without admin/Developer Mode, so 7za returns exit 2 and electron-builder aborts. We don't have a code-signing certificate yet, so the winCodeSign step is skipped. Re-enable (and wire up `CSC_LINK` / `CSC_KEY_PASSWORD` env vars) before the first public release.
  - `win.artifactName` now includes `-Setup` so the NSIS installer doesn't collide with a future portable build.
- `package.json` scripts: dropped the redundant `portable` Windows target (was overwriting the NSIS installer due to a non-existent `${target}` macro in the artifactName template).
- `resources/extraResources` glob `'yt-dlp*'` → explicit `'yt-dlp.exe'` (electron-builder's `expand` step rejected the glob with "file source does not exist").
- `resources/app.meta.json` version 0.0.1 → 0.1.0 to match `package.json`.
- `.gitignore` now ignores `test_output.txt` (with underscore) in addition to the existing `test-output.txt` (with dash).

### Fixed

- **`npm run dist:win` now produces an installer** on Windows in non-admin / non-Developer-Mode environments. Was silently failing the whole build with `cannot execute cause=exit status 2` from the winCodeSign extraction step.
- NSIS installer's `extraResources` glob is no longer rejected — yt-dlp now correctly bundles inside the installer (was previously only in the unpacked build).
- `mergeRecommendations` integration test for the per-artist cap was actually broken by the old head+tail algorithm (5-Coldplay-in-top-6 instead of 1); the new algorithm fixes it and the test now passes deterministically.
- **YouTube Music playback auto-recovers from expired stream signatures.** When a signed `googlevideo.com` URL expires (~6h lifetime — surfaces as a `403` from the proxy, opaque `MEDIA_ERR_SRC_NOT_SUPPORTED` to the audio element), the player store now does a lightweight `HEAD` preflight against the proxy URL before handing it to the audio engine. On `403` it re-resolves via the IPC `playTrack` call (which re-runs `yt-dlp` to get a fresh signed URL) and loads the new stream in-band — no manual replay needed, no `MEDIA_ERR_SRC_NOT_SUPPORTED` flash. The retry is bounded: a second `403` surfaces a clear "try again in a few minutes" error instead of looping. 5xx preflights short-circuit to a clear "upstream down" message rather than letting the audio element report the generic decode error. New `isProxyStream` / `preflightProxyStream` / `resolveStreamWithRetry` exports in `playerStore.ts` are pure functions and fully unit-tested.
- **Main window now shows the native Windows chrome (min / max / close + draggable titlebar).** Was `frame: false, titleBarStyle: 'hidden'` which left the window borderless with no way to minimize, maximize, or close — the standard Electron-on-Windows behaviour is restored. Also added `autoHideMenuBar: true` so the File / Edit / View menu bar is hidden by default (Alt toggles it back). The splash window and mini-player are unchanged (they are intentionally borderless — splash has its own custom design with a drag region, mini-player is a floating chip).
- **Windows installer now shows the Harmonix logo in the Start Menu / taskbar pinned shortcut / Explorer** instead of the generic broken-image placeholder that Electron ships by default. Root cause: `win.signAndEditExecutable: false` in `electron-builder.yml` was set as a workaround for the winCodeSign 7za symlink failure (Windows can't create darwin dylib symlinks without admin / Developer Mode), but it also skipped the `rcedit` step that embeds `resources/icon.ico` into the built `.exe`. A new `scripts/embed-icon.cjs` re-implements just the icon-embedding half by calling the `rcedit` npm package directly, and is wired into electron-builder via the `afterPack` hook. The script no-ops on macOS / Linux (which use `.icns` and `.png`/desktop-entry files). When a code-signing certificate is available, re-enable `signAndEditExecutable: true` (and add `CSC_LINK` / `CSC_KEY_PASSWORD`) — the afterPack hook can be removed at that point.
- **System tray icon is no longer squished** — `resources/icon.png` was 220x160 (non-square) and `nativeImage.resize({ width: 16, height: 16 })` in `electron/main/tray.ts` doesn't preserve aspect ratio, so the 16x16 tray icon was stretched horizontally. `icon.png` is now regenerated from the largest _actually-square_ sub-image of `resources/icon.ico` (the 128x128 PNG) by a new `scripts/sync-tray-icon.cjs` that parses each ICO sub-image's PNG header and rejects stamped ones (the ICO's "256x256" entry was actually a 220x160 PNG). Falls back to `resources/logo.png` (1254x1254) if every ICO sub-image turns out to be non-square. New 3-test `tests/unit/iconAssets.test.ts` guards the regression (asserts the PNG header dims are square and ≥32x32).
- **Release workflow no longer fails on the Windows runner** — the `Resolve tag name` step used POSIX bash syntax (`if [ ... ]`, `${GITHUB_REF#refs/tags/v}`) but the Windows runner defaults to PowerShell, which aborted with `Missing '(' after 'if' in if statement`. Added `shell: bash` to that step (the other two bash-syntax steps already declared it). Also rewrote the version extraction so `workflow_dispatch` doesn't produce the literal string `main` (the parameter expansion was a no-op when the prefix didn't match), which would have broken `npm version`.

### Removed

- `test_output.txt` (281 KB of stray test output) and `resources/brand-guide.png` (byte-identical duplicate of `resources/logo.png`, not referenced anywhere) deleted. The latter is preserved by `splashWindow.ts`'s fallback path which prefers `public/logo.png` and falls back to `resources/logo.png` in the production Electron build.

### Tests

- 20 new tests in `tests/unit/spotifyAudioFeatures.test.ts` covering the URL builder (prefix stripping, empty / whitespace handling, 100-id cap rejection, mixed-prefix inputs) and the response parser (null entry skipping, missing-id skipping, defensive type handling).
- 9 new tests in `tests/unit/scoring.test.ts` for `cosineSimilarity` (identical, different, symmetry) and `rerankByAudioSimilarity` (boost, no-penalty, weight=0, sort stability, purity, per-track field preservation).
- 11 new tests in `tests/unit/scoring.test.ts` for the 4th "personal" signal (contribution, rank decay, weight=0 disabled, additive with other signals, exclude set, backward compat, empty input, dedup, diversity reorder, lone-personal case).
- Total: **1029 tests across 111 files**; **1002 pass**, **27 fail** (all pre-existing better-sqlite3 env issues in `playlistRepository` / `trackRepository` — `NODE_MODULE_VERSION 137` vs the test runner's `115`). Zero new regressions.
- 16 new tests in `tests/unit/playerStoreProxyRecovery.test.ts` covering the YouTube 403 expired-signature recovery: `isProxyStream` predicate (5 cases — proxy stream true, requiresProxy false/undefined, mismatched URL, spotify-sdk exclusion), `preflightProxyStream` helper (4 cases — 2xx ok, 403 surface, 502 surface, network-failure null), and the `play()` flow integration (7 cases — non-proxy skip, spotify-sdk skip, preflight OK, 403 retry with fresh stream, 5xx short-circuit error, bounded no-loop re-resolve failure, preflight-network-error fall-through). Total: **1052 tests across 112 files**, all passing, zero new regressions.
- 10 new tests in `tests/unit/windowManager.test.ts` for the main-window `BrowserWindow` constructor options: native frame (no `frame: false`), no hidden titleBarStyle (rejects both `'hidden'` and `'hiddenInset'`), min/max/closable (explicit or default), minimum size to prevent layout collapse, sensible first-launch size, no `alwaysOnTop` on the main window, and the createMainWindow singleton invariant.
- 1 new end-to-end test in `tests/unit/buildWindowsIcon.test.ts` that extracts the icon Windows actually displays for the built `.exe` (via `System.Drawing.Icon.ExtractAssociatedIcon`, the same API Explorer uses) and asserts it matches `resources/icon.ico` by SHA-256. The test fails loudly (with both hashes printed) if the icon was never embedded — catches the regression where the Start Menu showed a broken-image placeholder. Skipped automatically on non-Windows or when the .exe isn't built.
- 7 new tests in `tests/unit/embedIcon.test.ts` for the `afterPack` hook: is a no-op on macOS / Linux, embeds `<repo>/resources/icon.ico` into `<appOutDir>/<productFilename>.exe` on Windows, uses `packager.appInfo.productFilename` (not a hard-coded name), skips silently when the built `.exe` is missing, skips silently when the source `icon.ico` is missing, propagates `rcedit` errors so electron-builder fails the build loudly.
- 3 new tests in `tests/unit/iconAssets.test.ts` for `resources/icon.png`: exists, is square (the tray resize is `nativeImage.resize({ width, height })` which does NOT preserve aspect ratio), and is at least 32x32. The "is square" test fails with both dimensions and a one-line regenerate command if the asset is ever re-shipped as non-square.
- **Global keyboard shortcuts** — `Space` (play/pause), `←`/`→` (prev/next), `↑`/`↓` (volume), `M` (mute). Skipped automatically when typing in inputs. A new `KeyboardShortcutsPanel` in Settings lists them.
- **OLED-friendly chrome** — sidebar, player bar, and main body background switched to pure `#000000` so colorful artwork pops and OLED pixels are off.
- **Track-change animation** in the player bar (subtle fade + slide) via a new `harmonix-track-in` keyframe; respects `motion-reduce`.
- **Album artwork** is now actually displayed in the player bar (was a static `🎵` placeholder), with graceful fallback.
- **Volume icon** reflects mute / low / normal level.
- **Sidebar** auto-scrolls the active nav item into view on route change.
- **Release workflow** (`.github/workflows/release.yml`) — tag a `v*` push (or run `workflow_dispatch`) to build installers for Windows, Linux, and macOS in parallel and publish them as a GitHub Release.
- **`.nvmrc`** pinning Node 20 for local + CI consistency.
- **GitHub repo placeholders** in `package.json`, `CHANGELOG.md`, `CONTRIBUTING.md`, and the Settings/YT-Music status screens now point at the real `BayuRifki/harmonix` repo.
- **Mini-player mode** — compact 360×120 frameless window with current track, transport controls, clickable progress bar, and right-click "always on top" toggle. Toggle from the player bar, system tray, or `Ctrl/Cmd+Shift+M`. Playback stays in the main renderer; the mini surface is read-only and drives the engine via IPC.
- **State sync IPC bus** (`player:get-state` / `player:push-state` / `player:command` / `player:state-changed` broadcast) keeps the mini-player in sync with the main player's `usePlayerStore`.
- **System tray** with a right-click menu (Show main, Show/Hide mini-player, Quit) and click-to-focus behavior.
- **Window position persistence** for the mini-player (`window.miniPlayer.{x,y,width,height,alwaysOnTop}` in the existing `settings` table) with display-bounds clamping.

### Changed

- Player bar volume slider + seek bar use the adaptive accent (`accent-color: var(--accent)`) instead of a static brand color.
- Play-button hover/active scale animation now respects `motion-reduce`.
- `App.tsx`: removed dead `isPlaylistsRoute && null` branch and the now-unused `useLocation` import.
- `ScanControls.tsx`: removed dead `usePlayerStore` import and `void play` no-op.
- `HomeView`: heading reduced from `text-4xl` to `text-3xl` for better app-shell balance.
- Several static `text-brand-400` / `bg-brand-500` markers swapped for the accent CSS var so the adaptive theme flows through.

### Fixed

- Player bar no longer shows a `🎵` placeholder when no track is playing.
- Volume slider and seek bar now use the user's chosen accent color rather than the hard-coded brand color.
- `useKeyboardShortcuts` correctly skips `contenteditable` elements (attribute fallback added for jsdom and older browsers).
- **Equalizer is now actually wired into the Web Audio graph.** The 10-band BiquadFilter chain is inserted between the engine's gain node and the destination inside `AudioEngine.ensureContext()`, so slider changes reach the audio. Previously the engine created `gainNode → destination` and never connected the equalizer at all (an orphaned `Equalizer.connect()` call in `sourceResolver.ts` ran too late and would have left a Y-splitter anyway); the chain has been moved into the engine, made idempotent, and given a `disconnect()` cleanup path in `destroy()`.
- **Equalizer slider direction corrected.** The native range input is now given `direction: 'rtl'` alongside its `writing-mode: vertical-lr` so clicks at the top of a band = max gain (+12 dB) and clicks at the bottom = min gain (−12 dB), matching the visible thumb and fill.

### Tests

- 23 new unit tests for `colorExtractor` (RGB→HSL math, hue-bucket clustering edge cases, CORS/empty/gray inputs, saturation/lightness clamping, `hslToString` rounding) and `useKeyboardShortcuts` (input/textarea/select/contenteditable detection, all six shortcut mappings including mute toggle and 0.8-restore fallback). Total: **314 tests** across **26 files**, all passing.
- 18 new unit tests for the mini-player: 11 for `PlayerStateBus` + `applyPlayerAction` reducer (play/pause/toggle/seek/next/prev/volume/shuffle/repeat, subscriber notifications, listener error isolation, singleton bus) and 7 for `clampToDisplayBounds` (right/bottom/left/top edge clamping, offset displays, minimum visibility guarantee). Total: **355 tests** across **29 files**, all passing.
- 14 new unit tests for the equalizer: 5 wiring tests in `equalizerWiring.test.ts` (engine calls `equalizer.connect()` on first `load()`, the gain node is never connected directly to destination so no Y-splitter, the last filter is connected to destination, `destroy()` tears the chain down, `createGain` is called only once across multiple loads) and 9 new tests in `equalizer.test.ts` (idempotent reconnect, stored gains survive a re-`connect()`, `setBandGain` works before `connect()`, `isConnected()` before/after, `disconnect()` clears state, plus 3 wiring-connection assertions). Total: **369 tests** across **30 files**, all passing.

#### Phase 0 — Foundation

- Initial project scaffold (Electron + Vite + React + TypeScript)
- Comprehensive documentation (README, PLANNING, ARCHITECTURE, SOURCES, LEGAL, CONTRIBUTING)
- Architecture Decision Record (ADR-0001: Electron over Tauri)
- GitHub issue and PR templates
- CI workflow (lint, typecheck, test)
- GitHub folder placeholders for sources (Spotify, YouTube Music, Local)
- Core type definitions for `Track`, `Album`, `Artist`, `Playlist`, `MusicSource`, `StreamInfo`
- Hello-world app shell with sidebar + main view + player bar layout
- Vitest unit-test config
- Playwright e2e config + smoke test
- VSCode workspace settings (extensions + formatting)
- SECURITY.md disclosure policy
- `.gitattributes` for cross-platform line endings

#### Phase 1 — Local Library

- SQLite (sql.js) database layer with migrations and version tracking
- Repositories: tracks, scan_folders, settings, playlists
- Recursive music file scanner with extension allowlist
- Metadata extraction via `music-metadata` (ID3, Vorbis, FLAC, MP4, etc.) + artwork extraction
- `LocalSource` implementation of `MusicSource` interface
- IPC handlers: `library:pick-folder`, `library:scan`, `library:get-tracks`, `library:get-albums`, `library:get-artists`, `library:get-stats`, `library:play-track`, etc.
- Web Audio API playback engine (gain node, MediaElement source, play/pause/seek/volume)
- 10-band equalizer foundation (BiquadFilter chain)
- Preload API: `window.api.library.*` with safe contextBridge exposure
- Zustand `libraryStore` + `playerStore` (full state management with queue, shuffle, repeat)
- React UI:
  - `LibraryView` with tabs (Tracks / Albums / Artists)
  - `ScanControls` (folder picker, scan progress, rescan, remove)
  - `TrackList` (double-click to play, shows current track)
  - `AlbumGrid` and `ArtistList`
  - Real `PlayerBar` with play/pause/next/prev/seek/volume/shuffle/repeat
- Search across tracks/albums/artists
- Unit tests: scanner (6), rowToTrack (9), equalizer (7), playerStore (4) — 26 tests total
- Split tsconfig: `tsconfig.test.json` (renderer+tests), `tsconfig.main.json` (main process)

#### Phase 2 — Source Adapter Interface (Plugin System)

- `SourceAdapter` abstract base class with `SourceCapabilities` flags (canSearch/canStream/requiresAuth/etc.)
- Capability-gated default methods throw clear errors when called on unsupported features
- `SourceAdapterConfig` for per-source settings persistence
- Refactored `LocalSource` to extend `SourceAdapter` (backward-compatible)
- New `DemoSource` proof-of-concept (~150 lines) with 3 hardcoded tracks and public test audio URLs
- Upgraded source registry with `listRegistrations()`, `getEnabledSources()`, `getAllAuthStatuses()`
- New `electron/main/ipc/sources.ts` with 8 handlers (list/enable/config/search/play)
- Per-source enable/disable persisted in SQLite settings table
- `window.api.sources.*` preload API: list, listEnabled, setEnabled, loadConfigs, saveConfig, getAuthStatuses, search, playTrack
- Cross-source parallel search: all enabled sources fanned out in `Promise.all`
- Unified `sources:play-track` IPC replacing `library:play-track` (now goes through any adapter)
- New `sourcesStore` Zustand store
- React UI:
  - `SourcePicker` component in Settings — toggle sources on/off, see capabilities badges
  - `SearchView` redesigned to do real cross-source parallel search with debouncing
  - `LibraryView` got source filter dropdown + per-track source label
- Unit tests: `DemoSource` (15), `SourceAdapter` (12) — 27 new tests, 53 total
- Updated `docs/SOURCES.md` with new `SourceAdapter` pattern, capabilities, and 20-line minimal template

### Runtime fixes (post-Phase 2 smoke test)

- **sql.js WASM loading**: bundled `sql-wasm.wasm` to `resources/` and added multi-path resolution (process.resourcesPath, app path, dev node_modules)
- **DB write**: `mkdirSync` now creates the correct data directory (was creating parent)
- **Renderer load**: fixed `loadFile` path resolution to find `dist/index.html` in both dev and prod layouts
- **CSP**: relaxed for dev (Vite needs `unsafe-eval` for HMR); production-only tightening planned for Phase 7
- **Error handling**: added `unhandledRejection` and `uncaughtException` handlers in main; wrapped startup phases in try/catch so a failure in one phase doesn't kill the whole app
- **electron-builder.yml**: added `extraResources` entry for `sql-wasm.wasm` to ship with packaged builds

#### Phase 3 — Spotify Integration

- **OAuth 2.0 PKCE flow** with mini HTTP callback server (`auth/callbackServer.ts`), state CSRF protection, 5-min timeout
- **`auth/pkce.ts`**: cryptographically-secure code verifier (RFC 7636 charset), SHA-256 challenge, state generator
- **`auth/tokenStore.ts`**: encrypted token persistence via Electron's `safeStorage` (OS-level: Keychain/DPAPI/libsecret), graceful plaintext fallback when encryption unavailable
- **Spotify Web API client** (`sources/spotify/client.ts`): search/getTrack/getUserPlaylists/getPlaylist/getPlaylistTracks/getLikedTracks, automatic token refresh on expiry, profile caching
- **`SpotifySource` adapter** extending `SourceAdapter` with all 7 capabilities
- **Stream URL strategy**: Premium → `spotify-sdk://<id>` protocol, Free → 30-sec preview HTTP URL with expiry
- **Web Playback SDK** integration in renderer (`lib/audio/spotifyPlayback.ts`) for Premium users
- **Auth IPC**: `auth:spotify:login`, `auth:spotify:logout`, `auth:spotify:status`, `auth:list`
- **`SpotifyLoginButton` UI** with embedded setup instructions (when Client ID is missing)
- **Auth store** (`stores/authStore.ts`) for state management
- **CSP allowlist** for `sdk.scdn.co`, `api.spotify.com`, `accounts.spotify.com`
- **vitest config**: switched to `singleThread: true` to avoid test pollution from module-level singletons
- **Unit tests**: PKCE (8), SpotifySource (10) — 18 new tests, **71 total**

#### Phase 4 — YouTube Music Integration (Unofficial)

- **`youtubei.js` integration** for music search (uses `WEB_REMIX` client, no auth required)
- **`yt-dlp` subprocess wrapper** (`sources/ytmusic/ytdlp.ts`) with multi-path discovery:
  - `YT_DLP_PATH` env var → `resources/yt-dlp` (per-OS) → `process.resourcesPath` → system PATH
- **Stream resolution** via `yt-dlp -g -f bestaudio` with 30s timeout, m3u8/youtube/http protocol detection
- **`YouTubeMusicSource` adapter** with capabilities: search + stream, no playlists/liked tracks
- **Mandatory disclaimer modal** (`YtMusicDisclaimer.tsx`) that blocks app until acknowledged
- **Disclaimer acceptance persistence** via `SourceAdapter.config.settings`
- **IPC**: `ytmusic:disclaimer-text`, `ytmusic:requires-disclaimer`, `ytmusic:acknowledge-disclaimer`, `ytmusic:status`
- **`YtMusicStatus` panel** in Settings (shows yt-dlp version or install instructions)
- **Lazy `app` injection** in `ytdlp.ts` to keep modules testable
- **Fixed song mapper** to match actual `MusicResponsiveListItem` shape from youtubei.js
- **Unit tests**: 10 new tests for `YouTubeMusicSource` — **81 total**
- **Runtime smoke test**: confirmed Electron launches with 4 sources (local, demo, spotify, ytmusic), no errors
- **Live integration test**: installed `yt-dlp` + `ffmpeg` via scoop, ran search via `npx tsx tests/manual-ytmusic.ts`, successfully resolved stream URLs from real YouTube Music

#### Phase 5 — Playlists & Queue

- **`playlistRepository`** (electron/main/db/playlistRepository.ts): full CRUD — create / rename / delete / addTrack / removeTrack / reorder / setPlaylistTracks / countPlaylistTracks. Reorder uses 2-pass approach (set to `tempOffset` 100000+, then to final positions) to avoid in-transaction `UPDATE ... WHERE position = Y` collisions
- **`playlistResolver`** (electron/main/sources/playlistResolver.ts): cross-source `Track` resolution from `source:trackId` URIs, returns null for unresolved tracks
- **9 IPC handlers** in `electron/main/ipc/playlists.ts`: `playlists:list`, `playlists:get`, `playlists:create`, `playlists:rename`, `playlists:delete`, `playlists:add-track`, `playlists:remove-track`, `playlists:reorder`
- **`playlistsStore`** (src/stores/playlistsStore.ts): Zustand store with refresh / load / create / rename / remove / addTrack / removeTrack / reorder / playAll. Uses lazy-import pattern to avoid test pollution
- **`PlaylistsView`** (src/features/playlist/): list view with create / rename / delete UI
- **`PlaylistDetailView`**: drag-drop reorder (HTML5 native), double-click to play, inline rename, unresolved track warning
- **`AddToPlaylistMenu`** modal: picker to add any track to any playlist — surfaced as "+" button on every track in `TrackList`
- **`QueuePanel`**: now playing + history + up next with drag-to-reorder, accessible from `PlayerBar` queue toggle (with up-next count badge)
- **`__setDbForTest` injection** in `database.ts` for testability of repo code without a full Electron app
- **Test infrastructure cleanup**: removed duplicate `cleanup()` in `tests/setup.ts` (RTL v16 auto-registers `afterEach(cleanup)`); refactored `playerStore.test.ts` to use direct `getState()` instead of `renderHook` (avoids `singleThread: true` race condition)
- **Unit tests**: `playlistRepository` (11), `playlistsStore` (15) — **107 total tests, all green**
- **Verified**: `npm run typecheck` (0 errors), `npm run lint` (0 warnings), `npm run test` (107/107), `npm run build` succeeds, Electron smoke test launches 4 sources cleanly

#### Phase 6 — Equalizer & Audio Effects

- **Built on the Phase 1 EQ foundation** (`src/lib/audio/equalizer.ts`): 10-band `BiquadFilter` chain (peaking, Q=1.4, -12..+12 dB)
- **7 built-in presets** (Flat, Rock, Pop, Bass Boost, Vocal, Classical, Jazz) defined in `src/lib/audio/presets.ts` and `electron/main/sources/presets.ts`
- **Shared EQ types/constants** added to `electron/main/sources/types.ts` (`EqPreset`, `EQ_BAND_FREQUENCIES`, `EQ_MIN_GAIN`, `EQ_MAX_GAIN`, `FLAT_GAINS`, `clampGain`, `clampGains`) — re-exported through `src/types/index.ts` for renderer
- **Migration 2 (`eq_presets`)** in `electron/main/db/migrations.ts`: new SQLite table for custom presets (id, name UNIQUE, gains JSON, created_at, updated_at)
- **`eqRepository`** (`electron/main/db/eqRepository.ts`): full CRUD (list / getByName / save / delete) + state load/save via `settings` table (`eq.activePreset` + `eq.currentGains` keys)
- **6 IPC handlers** in `electron/main/ipc/equalizer.ts`: `eq:get-state`, `eq:save-state`, `eq:list-all-presets`, `eq:list-custom-presets`, `eq:save-custom-preset`, `eq:delete-custom-preset`
- **`equalizerStore`** (`src/stores/equalizerStore.ts`): Zustand store with `load` / `applyPreset` / `setBandGain` / `setAllGains` / `reset` / `saveCustom` / `deleteCustom`. **Auto-applies to `equalizer` engine on every change**. 500ms debounced persist via IPC.
- **`EqualizerView`** (`src/features/equalizer/EqualizerView.tsx`): full UI with 10 vertical sliders (band labels + dB readout), preset dropdown (built-in + custom grouped), save-as modal, delete-custom button, reset-to-Flat button, Spotify-limitation notice
- **Auto-load on app start** (`App.tsx` useEffect calls `useEqualizerStore.load()`)
- **Sidebar nav** entry added (`/equalizer` route, `🎛️` icon)
- **Unit tests**: presets (18), eqRepository (13), equalizerStore (13) — 44 new tests, **151 total**
- **Verified**: `npm run typecheck` (0 errors), `npm run lint` (0 warnings), `npm run test` (151/151), `npm run build` succeeds, Electron smoke test launches with migration 2 applied + 4 sources init

#### Phase 7 — Polish & Release + Memory Optimization

- **Splash screen**: brand-gradient + spinner in `index.html`, fades out on React mount (`src/main.tsx` adds `app-ready` class to root).
- **Dark/light theme**:
  - `themeStore` (Zustand) with `dark`/`light`/`system` modes, persisted to `localStorage` (`harmonix.theme` key)
  - CSS variables in `src/index.css` (`--bg-primary`, `--text-primary`, etc.) and `tailwind.config.ts` `darkMode: ['class', 'dark']`
  - `ThemePicker` UI in Settings (3-button picker)
  - `cycleTheme()` API ready for keyboard shortcuts
  - `attachSystemListener()` follows `prefers-color-scheme` changes in real time
- **Memory optimization (focus of this phase)**:
  - **Innertube singleton cache** (`electron/main/sources/ytmusic/innertubeCache.ts`): refCount sharing so multiple concurrent searches reuse the same `youtubei.js` instance. 5-min idle TTL auto-disposes via `setTimeout`. Graceful `signOut()` on dispose. **Eliminates ~250 MB leak per YouTube Music search**
  - `YouTubeMusicSource` refactored to use shared cache via `acquireInnertube()` / `releaseInnertube()` pattern with `try/finally` — no more per-search `Innertube.create()`
  - `MAX_SEARCH_RESULTS = 50` cap on YouTube Music results to reduce downstream memory pressure
  - **Audio engine listener leak fix** in `playerStore.ts`: unsubscribe functions (`offState`/`offTime`/`offEnded`/`offError`) stored and cleaned up on `beforeunload` (with `typeof window.addEventListener` guard for SSR/test safety)
  - **Virtualized `TrackList`** (`src/features/library/TrackList.tsx` + `src/hooks/useVirtualWindow.ts`): only renders rows in viewport when `tracks.length > 200` (VIRTUAL_THRESHOLD). Fixed 40px row height, 6-row overscan. `computeVirtualWindow` is a pure function for testability
  - **Memory IPC** (`electron/main/ipc/memory.ts`): `mem:stats` returns `{ rss, heapUsed, heapTotal, refCount, uptime }` + `mem:gc` triggers `global.gc()` if available (requires `--expose-gc` flag)
  - **`MemoryPanel` UI** in Settings: live RSS auto-refresh every 5s, color-coded (green <800 MB / yellow <1500 MB / red ≥1500 MB), "Run GC" button
- **electron-updater** installed (`electron-updater` ^6.8.3) — wiring into main process pending publish config
- **`electron-builder.yml`**: macOS icon now points to `resources/icon.png` (PNG fallback for ICNS), extra splash resources bundled
- **Unit tests**: themeStore (8), innertubeCache (6), useVirtualWindow (6, pure-function) — 20 new tests, **171 total**
- **Verified**: `npm run typecheck` (0 errors), `npm run lint` (0 warnings), `npm run test` (171/171), `npm run build` succeeds, Electron smoke test launches

#### Phase 8 — Additional Sources

- **Deezer** (`electron/main/sources/deezer/`): `DeezerClient` + `DeezerSource extends SourceAdapter`. Public API, no auth, 30s MP3 previews. Capabilities: search + stream + getTrack + getAlbumTracks + getPlaylistTracks + getArtistTopTracks. 30-min expiry on preview URLs (matches Spotify pattern). **29 unit tests** in `deezerSource.test.ts`
- **Jamendo** (`electron/main/sources/jamendo/`): `JamendoClient` + `JamendoSource`. Requires `JAMENDO_CLIENT_ID` env var (falls back to public test id `709fa152` for development). Full CC-licensed indie music streaming (no 30s limit). Capabilities: search + stream + getTrack + getAlbumTracks + getPlaylist + getPlaylistTracks + getArtistTracks + getPopularTracks. **17 unit tests** in `jamendoSource.test.ts`
- **Audius** (`electron/main/sources/audius/`): `AudiusClient` + `AudiusSource`. Decentralized protocol, no auth, public discovery node at `audius.co` (overridable via `AUDIUS_HOST` env var). Capabilities: search + stream + getTrack + getPlaylist + getPlaylistTracks + getTrendingTracks + getArtistTracks. Artwork picker prefers 480x480 → 1000x1000 → 150x150. Stream URLs built from `user_id=harmonix` placeholder. **21 unit tests** in `audiusSource.test.ts`
- **SoundCloud** (`electron/main/sources/soundcloud/`): `SoundCloudClient` + `SoundCloudSource`. Requires `SOUNDCLOUD_CLIENT_ID` (and optionally `SOUNDCLOUD_CLIENT_SECRET`) for full features. Without config, source reports "Configuration missing" and search returns empty (graceful). Uses `/search/tracks` v2 endpoint. Artwork URL transformation `-large.jpg` → `-t500x500.jpg` for higher resolution. OAuth scaffolding (`setAccessToken`/`setRefreshToken`/`clearTokens`/`isAuthenticated`) ready for future auth flow. **25 unit tests** in `soundcloudSource.test.ts`
- **Integration**: All 4 sources registered in `electron/main/index.ts` with env-var-based config. Main bundle grew from ~85 kB to ~113 kB (4 new API clients)
- **Verified**: `npm run typecheck` (0 errors), `npm run lint` (0 warnings), `npm run test` (**263/263** pass across 21 test files), `npm run build` succeeds

#### Phase 9 — UI Integration

Brought the renderer's UI in sync with the 8 source capabilities. Most of Phase 8's value was previously hidden behind a toggle in Settings.

- **New IPC methods** (`electron/main/ipc/sources.ts`):
  - `sources:user-playlists` — list a source's user playlists (capability-gated, gracefully returns `[]` if not supported)
  - `sources:liked-tracks` — list a source's liked/saved tracks
  - `sources:playlist-tracks` — fetch a playlist's tracks by source id + playlist id
  - `sources:get-config` — read a source's stored settings (used by config UI)
- **New per-source landing view** (`src/features/source/SourceView.tsx`, route `/source/:id`):
  - Source name, id badge, auth indicator, capability pills
  - "Search this source" CTA (deep-links to `/search?source=…`)
  - "Liked Tracks" section (max 50, double-click to play) — shown when `canGetLikedTracks`
  - "Your Playlists" section with per-playlist expandable track lists (max 50/playlist) — shown when `canGetPlaylists`
  - Graceful error/disabled states
- **Per-source nav in Sidebar** (`src/components/layout/Sidebar.tsx`): "Sources" sub-section showing all enabled sources with `canSearch || canGetPlaylists || canGetLikedTracks`. Each entry links to `/source/:id`
- **Source indicator on PlayerBar** (`src/components/layout/PlayerBar.tsx`): colored badge showing the active track's source id (green=Spotify, red=YT Music, blue=Local, etc.)
- **Per-source config UI** (`src/features/settings/SourcePicker.tsx`): ⚙ button on each configurable source opens a dialog to edit credentials. Wired to `sources:get-config` and `sources:save-config`. Supports Spotify, Jamendo, Audius, SoundCloud
- **PlaylistDetailView unresolved info** (`src/features/playlist/PlaylistDetailView.tsx`): now shows which source each unresolved track came from (with source name lookup from registrations)
- **HomeView refresh** (`src/features/home/HomeView.tsx`): shows enabled source count, "X of Y sources enabled", quick actions grid, and enabled sources list with "Browse →" links for capable sources
- **SearchView query param** (`src/features/search/SearchView.tsx`): `/search?source=spotify` pre-selects the source. Toggling sources updates the URL
- **Component test infrastructure**:
  - Installed `@testing-library/jest-dom@^6`
  - `tests/setup.ts` now exports `installMockWindowApi(opts)` helper and stubs `Node`/`Element`/etc. on globalThis to work around jsdom 25 + React 18 issues
  - Switched vitest `pool: 'threads'` → `'forks'` for proper React test isolation
  - Added component tests: `tests/unit/sidebar.test.tsx` (6 tests), `tests/unit/sourcePicker.test.tsx` (8 tests), `tests/unit/sourceView.test.tsx` (7 tests) — 21 new component tests
- **tsconfig.test.json**: expanded `include` to cover all 8 source directories (was missing deezer/jamendo/audius/soundcloud)
- **Verified**: `npm run typecheck` (0 errors), `npm run lint` (0 warnings), `npm run test` (**284/284** pass across 24 test files), `npm run build` succeeds (renderer bundle grew from 395 kB to 428 kB)

#### Phase 10 — Mini-Player Mode

A compact, always-available floating player surface for power users. The full app stays open in the background; the mini-player is a separate frameless 360×120 window that drives the main renderer's audio engine through a state-sync IPC bus.

- **State sync backbone** (`electron/main/playerState.ts`, `electron/main/ipc/player.ts`):
  - `PlayerStateBus` — in-memory snapshot holder + pub-sub for state changes
  - Pure reducer `applyPlayerAction(snapshot, action)` — unit-tested with 11 tests
  - New IPC: `player:get-state`, `player:push-state`, `player:command`, broadcast `player:state-changed`
- **Window manager** (`electron/main/windowManager.ts`):
  - `createMainWindow()` extracted from the previous inline definition in `index.ts`
  - `createMiniPlayerWindow({ x, y, alwaysOnTop })` — frameless, `skipTaskbar: true`, `minimizable/maximizable: false`, `resizable` vertically only (80–400 px)
  - `showMiniPlayer / hideMiniPlayer / toggleMiniPlayer` — hide-on-close (do not destroy unless the user is actually quitting)
  - Pure `clampToDisplayBounds(x, y, w, h, workArea)` extracted to `electron/main/windowBounds.ts` and unit-tested with 7 tests (handles disconnected-monitor case)
- **Mini-player IPC** (`electron/main/ipc/miniPlayer.ts`):
  - `mini-player:show / hide / toggle / status / set-always-on-top / expand / save-bounds / close-window`
  - Persists `window.miniPlayer.{x, y, width, height, alwaysOnTop}` in the existing `settings` table
- **System tray** (`electron/main/tray.ts`):
  - Loads `resources/icon.png` (with fallbacks) at 16×16
  - Right-click menu: Show main, Show/Hide mini-player, Quit
  - Click on tray icon → focuses main window
  - Menu is rebuilt every second so the Show/Hide label stays accurate
- **Renderer side**:
  - `src/hooks/usePlayerStateSync.ts` — subscribes to `usePlayerStore`, pushes a normalized `MiniPlayerStateSnapshot` to the main process, and routes incoming mini-commands back into the local store. Mounted in `<MainApp />` only.
  - `src/features/miniPlayer/MiniPlayerView.tsx` — the mini UI: artwork (60×60), title/artist/source badge, transport buttons, clickable progress bar, "expand to full" + "hide" buttons, right-click context menu with "Always on top" toggle
  - `src/App.tsx` — detects mini mode via `window.api.miniPlayer.isMini()` (checks `location.hash === '#/mini'`); renders only `<MiniPlayerView />` for the mini window
  - `PlayerBar` — added a "minimize to mini-player" button (icon next to queue)
  - `useKeyboardShortcuts` — `Ctrl/Cmd+Shift+M` toggles the mini-player
- **Preload bridge** (`electron/preload/index.ts`):
  - `window.api.player.{getState, pushState, command, onStateChanged, onCommand}`
  - `window.api.miniPlayer.{isMini, show, hide, toggle, status, setAlwaysOnTop, expand, saveBounds}`
  - New shared types: `MiniPlayerStateSnapshot`, `MiniPlayerAction`, `MiniPlayerConfig`, `MiniPlayerBounds`
- **Audio ownership** — only the main renderer creates the `AudioContext`. The mini surface is purely visual; all playback decisions flow back to the main renderer.
- **Tests**: 18 new unit tests (`tests/unit/playerState.test.ts` ×11, `tests/unit/windowBounds.test.ts` ×7). Total now **355/355 pass across 29 test files** with 6 GB heap + `maxForks: 2`. Typecheck clean, lint clean, build succeeds (main +12 kB, preload +1.5 kB, renderer +15 kB).
- **Docs**: new "Mini-Player Window" section in `docs/ARCHITECTURE.md` with the state-sync flow diagram and the audio-ownership note. Phase 10 marked done in `docs/PLANNING.md`.

_Deferred_: end-to-end Playwright test for the mini-player flow (see Phase 10 checklist in `docs/PLANNING.md`).

### Changed

- Switched SQLite driver from `better-sqlite3` (native, requires MSVC build tools on Windows) to `sql.js` (pure-JS WebAssembly) for portable contributor onboarding. `better-sqlite3` can be reintroduced for production builds with native deps.

### Fixed

- `react/no-unescaped-entities` lint error in `HomeView.tsx`
- Vitest picking up Playwright e2e specs (added include/exclude patterns)
- TypeScript module resolution for `music-metadata` (split tsconfig with proper `node` types)
- Equalizer test required AudioContext (added mock to test data layer)

### Verified

- `npm install` succeeds
- `npm run typecheck` passes (0 errors) — main + test configs
- `npm run lint` passes (0 warnings)
- `npm run test` passes (263/263 unit tests across 21 files)
- `npm run build` succeeds (main 113.47 kB, preload 3.61 kB, renderer 395.14 kB)

---

## [0.0.1] - 2026-06-04

### Added

- Project initialized
- Documentation framework established
- Scaffolding for future development

[Unreleased]: https://github.com/BayuRifki/harmonix/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/BayuRifki/harmonix/releases/tag/v0.0.1
