# ADR-0001: Electron over Tauri

**Status**: Accepted
**Date**: 2026-06-04
**Deciders**: Project founder

---

## Context

Harmonix needs a desktop runtime that can:

1. Bundle a web UI (React) as a native app.
2. Make network requests to music APIs (Spotify, YouTube Music).
3. Read local files (music library).
4. Spawn external processes (`yt-dlp`).
5. Integrate with the Spotify Web Playback SDK (a browser-based SDK).
6. Package for Windows, macOS, and Linux.

The two leading options are **Electron** and **Tauri**.

---

## Decision

We will use **Electron 30+** as the desktop runtime.

---

## Options Considered

### Option A: Electron ✅ (Chosen)

**Pros:**
- Mature, battle-tested (used by VS Code, Slack, Discord, Spotify Desktop).
- **Spotify Web Playback SDK** works natively (it's a browser-based SDK).
- Massive ecosystem of plugins and examples.
- Cross-platform packaging via `electron-builder` is well-documented.
- Easy to spawn Node.js child processes (`yt-dlp`).
- Active community and frequent updates.

**Cons:**
- Larger bundle size (~150MB).
- Higher memory usage than native alternatives.
- Chromium version lag (security updates depend on Electron releases).

### Option B: Tauri

**Pros:**
- Much smaller bundle (~10MB).
- Lower memory footprint (uses system WebView).
- Rust backend is fast and memory-safe.
- Modern, growing ecosystem.

**Cons:**
- **Spotify Web Playback SDK is unverified** on Tauri (depends on system WebView, which varies by OS).
- Smaller community, fewer examples for music app use cases.
- `yt-dlp` integration requires Rust subprocess handling.
- More complex OAuth flows (system browser vs. embedded).
- Cross-platform quirks (Linux WebView, Windows WebView2).

### Option C: Native (e.g., Qt, Wails, Flutter Desktop)

**Pros:**
- Smallest binaries.
- Best performance.

**Cons:**
- Steeper learning curve.
- Smaller web UI ecosystem.
- Longer development time.

---

## Consequences

### Positive

- We can leverage the Spotify Web Playback SDK without compatibility concerns.
- Faster initial development due to abundant documentation and examples.
- Easy integration with `yt-dlp` via Node.js `child_process`.

### Negative

- Larger download size for end users (~150MB installer).
- Higher RAM usage (~150-300MB idle).
- We must keep Electron updated for security patches.

### Neutral

- Bundle size is acceptable for a desktop music player (users don't expect it to be tiny).

---

## References

- [Electron](https://www.electronjs.org/)
- [Tauri](https://tauri.app/)
- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk/)
- Similar projects: [Nuclear](https://nuclear.js.org/) (Electron), [SpotTube](https://github.com/milesmanley/SpotTube) (Electron)

---

## Notes

This decision can be revisited if:
- Spotify Web Playback SDK proves problematic on Electron.
- Bundle size becomes a major user complaint.
- Tauri's WebView support matures significantly.
