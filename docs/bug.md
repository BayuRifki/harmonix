# Harmonix - UI/UX & Functional Bug Report

This document outlines a comprehensive audit of the `Harmonix` (C:\Users\USER\Documents\program\music-media-player) project. It categorizes UI/UX, functional, and accessibility bugs discovered across all views and components.

## 1. Home / Hero Player (`/`)

- **[Race Condition]** `HeroPlayer.tsx:92-97`: The "Add to Favorites" (♡) button has a race condition that triggers an error toast when creating the Favorites playlist for the very first time.
- **[Dead Button]** `HeroPlayer.tsx:187-194`: The "More Options" (⋯) button in the Hero Player is purely cosmetic and lacks an `onClick` handler.
- **[Missing Feedback]** `HeroPlayer.tsx:154-162`: The Heart button lacks a loading or disabled state during its async operation, allowing users to spam-click it.
- **[Missing Error State]** `HomeView.tsx:12-14`: The `refresh()` call for music sources does not handle failures. Errors are swallowed, leaving the UI empty without a fallback or "Retry" option.
- **[UX/Dangerous]** `RightRail.tsx:141-149`: The "Clear History" button uses a misleading "⋯" (More Menu) icon and immediately deletes history without a confirmation dialog.
- **[Dead Interaction]** `RecommendationCard.tsx:27`: The entire recommendation card appears clickable (`cursor-pointer`, hover effects), but only the small `Play` icon inside the image actually triggers playback.
- **[Bug Logic]** `ForYouSection.tsx:16-41`: If the history is empty, starter recommendations can trigger a `Play` action on an empty track (`durationMs: 0`), causing a player error.

## 2. Search (`/search`)

- **[Missing Error State]** `SearchView.tsx:78-90`: If the search API fails, the UI remains in a stuck/empty state without any error notification or UI recovery path.
- **[Concurrency]** `SearchView.tsx:73-96`: The custom debounce function does not abort previous API requests. If a user types quickly, an older, slower request might resolve last and overwrite the results of the newer request.
- **[UX Discoverability]** `SearchView.tsx:297`: Search result items require a `Double Click` (`onDoubleClick`) to play. While common in desktop OS, this is non-standard for web UIs and lacks visual cues.
- **[Empty State Bug]** `SearchView.tsx:140`: If filters hide all search results, the empty state text still reads "No results for {query}", incorrectly implying the song doesn't exist rather than indicating the filters hid it.

## 3. Library & Explore (`/library`, `/explore`)

- **[Missing Error State]** `LibraryView.tsx:186`: Contains a loading state for reading library folders, but if the system fails to read the DB, there is no error state presented to the user.
- **[Truncation / Overflow]** `TrackList.tsx:84, AlbumGrid.tsx:26`: The UI consistently uses `truncate` for album and artist names but lacks a tooltip or expanded view, making long titles unreadable.

## 4. Playlist (`/playlists`)

- **[Race Condition/UX]** `PlaylistDetailView.tsx:207-210`: The Rename Playlist input has a flaw where pressing "Enter" triggers both `onKeyDown` and `onBlur` simultaneously, firing the API save function twice.
- **[Missing Confirmation]** `PlaylistDetailView.tsx:312`: The button to remove a track from a playlist acts instantly without confirmation, making it prone to accidental clicks.
- **[Drag & Drop Performance]** `PlaylistDetailView.tsx:53-56`: The `onDragOver` event fires continuously on every pixel movement without throttling, causing high CPU/memory usage.
- **[Missing Feedback]** `AddToPlaylistMenu.tsx:41`: Failing to add a song to a playlist uses a blocking native browser `alert()` instead of the consistent UI toast notification system.

## 5. Equalizer (`/equalizer`)

- **[Missing Loading State]** `EqualizerView.tsx:42-49`: During initial load, the skeleton only shows two lines of text. The main EQ canvas flickers with an empty screen before rendering.
- **[Missing Confirmation]** `EqualizerView.tsx:51-58`: The "Save Preset" function allows duplicate names and silently overwrites existing presets without warning.
- **[Visual Layout Bug]** `EqualizerView.tsx:176-180`: Y-axis Gain numerical labels (`+12 dB`, `0 dB`, `-12 dB`) are incorrectly distributed horizontally (`flex justify-between`) below the frequency bands, causing a visually confusing layout.

## 6. Settings (`/settings`)

- **[Dangerous Instant Action]** `KeyboardShortcutsPanel.tsx:252`: The "Reset all to defaults" button resets settings instantly without a warning dialog.
- **[Dangerous Instant Action]** `SourcePicker.tsx:217`: Disabling a Music Source toggles it instantly. If music from that source is currently playing, it cuts off abruptly without warning.
- **[Input Validation]** `ThemePanel.tsx:198-205`: The Custom Hex color input lacks strict validation; invalid hex strings are still saved into the state.

## 7. Now Playing & Mini Player (`/now-playing`, `/mini`)

- **[State Desync]** `MiniPlayerView.tsx:95-99`: The `positionMs` in the mini-player is artificially advanced via a local `setInterval` on the UI thread, rather than perfectly syncing with the audio engine's progress. This causes duration desync over time due to IPC delays.
- **[Missing Feedback]** `TrackInsightsPanel.tsx:133-139`: The "Play Similar" button lacks a loading indicator, and if the API request fails, it fails silently (`catch` block is empty).
- **[Layout]** `LyricsPanel.tsx:153`: The lyrics panel has a hardcoded `max-h-72`. On large monitors in full-screen Now Playing mode, the lyrics area appears awkwardly cramped.

## 8. Global Accessibility (A11y) Issues

The application has fundamental flaws for Keyboard and Screen Reader users:

- **No Focus Ring:** Many navigation buttons and track options lack `focus-visible` styles, making it impossible to see keyboard `TAB` selection states.
- **No Keyboard Handlers:** Interactive track items (in Search results, Queue panel, Tracklist, For You) primarily use `onClick` on `<div>` or `<li>` elements but omit `tabIndex={0}`, `role="button"`, and `onKeyDown` (Enter/Space) handlers. This prevents non-mouse users from playing music.
- **Invisible Hover Interactions:** The 'Play' button on recommendation cards and 'Remove' buttons in the Queue rely on `opacity-0 group-hover:opacity-100`. Users navigating via keyboard TAB or users who cannot use a mouse with precision cannot perceive or access these buttons.

## 9. Player Queue (`/player`, RightRail)

- **[Desync]** `QueueDrawer.tsx & QueuePanel.tsx`: Components duplicate queue reorder logic (`moveQueueItem`) instead of using playerStore. Rapid drag-and-drop desyncs UI and store.
- **[Ghost Playback]** `playerStore.ts`: Removing the currently playing track via UI just removes it from the array. The audio continues playing the deleted track instead of stopping or advancing.
- **[Bypass Store]** `RightRail.tsx`: Removing items bypasses `removeFromQueue` store method and mutates state directly.
- **[No Keyboard Support]** `QueueDrawer.tsx, QueuePanel.tsx, RightRail.tsx`: Queue list items `<li>` lack `tabIndex`, `role`, and `onKeyDown`. Cannot play items via keyboard.
- **[Stuck Drop UI]** `QueuePanel.tsx & QueueDrawer.tsx`: Missing `onDragLeave` implementation. Dragging over an item and leaving causes the blue drop indicator line to get permanently stuck.
- **[Inaccessible on Touch]** `RightRail.tsx`: The "Remove" button uses `opacity-0 group-hover:opacity-100`. Completely inaccessible on touch devices or via keyboard focus.
- **[Bug Filter & Play]** `QueueDrawer.tsx`: Fuzzy searching the queue and playing a result sends the `originalIndex` to `setQueue`, which behaves unpredictably if Shuffle is currently active.
