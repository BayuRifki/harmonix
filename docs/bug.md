# Bug Report - Harmonix

## Status Legend

- [x] **FIXED**
- [ ] **OPEN**

---

## Critical / High Priority

### [x] Double Media Controls (Layout Glitch)

- **File**: `App.tsx`, `PlayerBar.tsx`, `HeroPlayer.tsx`
- **Issue**: `TransportControls` tampil di HeroPlayer (Home) DAN PlayerBar secara bersamaan


### [x] Search Input Desync

- **File**: `TopBar.tsx`, `SearchView.tsx`
- **Issue**: 2 search inputs dengan state terpisah. Ketik di TopBar → SearchView input kosong


### [x] Blank Space Luas di Bawah PlayerBar pada menu setting

- **File**: `App.tsx`, Multiple view files
- **Issue**: Area kosong transparan di bawah PlayerBar pada menu setting karena layout height tidak benar


### [x] Ghost Playback

- **File**: `playerStore.ts`
- **Issue**: Menghapus track yang sedang diputar → audio tetap jalan
- **Fix**: Cek `position === queueIndex`, stop/next audio sebelum remove
- **Priority**: High

---

## Medium Priority

### [x] Dead Button "More Options"

- **File**: `HeroPlayer.tsx:187-194`
- **Issue**: Tombol "More Options" (⋯) tidak punya `onClick` → dead button
- **Fix**: Hapus tombol karena tidak ada fungsi yang diimplementasikan
- **Date**: 2026-06-10

### [x] Race Condition - Favorites Playlist

- **File**: `HeroPlayer.tsx:92-97`
- **Issue**: Race condition saat buat Favorites playlist pertama kali
- **Fix**: Gunakan `async/await` dengan proper error handling
- **Date**: 2026-06-11

### [x] Search Concurrency Bug

- **File**: `SearchView.tsx:73-96`
- **Issue**: Request lama bisa overwrite request baru
- **Fix**: Implement AbortController untuk cancel prev request
- **Date**: 2026-06-11

### [x] Double Save on Enter

- **File**: `PlaylistDetailView.tsx:207-210`
- **Issue**: Enter trigger `onKeyDown` + `onBlur` → save 2x
- **Fix**: Gunakan flag atau debounce
- **Date**: 2026-06-11

### [x] EQ Y-axis Label Position

- **File**: `EqualizerView.tsx:176-180`
- **Issue**: Label Y-axis Gain salah posisi (horizontal di bawah bands)
- **Fix**: Gunakan absolute positioning di sisi kiri
- **Date**: 2026-06-11

### [x] Play Similar Silent Fail

- **File**: `TrackInsightsPanel.tsx:104-137`
- **Issue**: "Play Similar" gagal silently, no loading state
- **Fix**: Tambah loading state & toast untuk error
- **Date**: 2026-06-11

### [x] Misleading Recommendation Card

- **File**: `RecommendationCard.tsx:27`
- **Issue**: Card terlihat clickable tapi hanya icon Play yang berfungsi
- **Fix**: Jadikan seluruh card clickable ATAU hapus `cursor-pointer`
- **Date**: 2026-06-11

### [x] Clear History - No Confirmation

- **File**: `RightRail.tsx:141-149`
- **Issue**: "Clear History" pakai icon "⋯" & hapus langsung tanpa konfirmasi
- **Fix**: Ganti icon ke Trash, tambah konfirmasi dialog
- **Date**: 2026-06-11

### [x] Disable Source While Playing

- **File**: `SourcePicker.tsx:217`
- **Issue**: Disable source → musik yang sedang diputar langsung terputus
- **Fix**: Tambah warning "Music from this source is playing"
- **Date**: 2026-06-11

### [x] Reset Shortcuts - No Confirmation

- **File**: `KeyboardShortcutsPanel.tsx:252`
- **Issue**: Reset to defaults tanpa konfirmasi
- **Fix**: Tambah dialog konfirmasi
- **Date**: 2026-06-11

---

## Low Priority

### [x] Missing Tooltips on Truncate

- **File**: `TrackList.tsx:84`, `AlbumGrid.tsx:26`
- **Issue**: Truncate tanpa tooltip → judul panjang tidak terbaca
- **Fix**: Tambah `title={text}` untuk tooltip
- **Date**: 2026-06-11

### [x] Lyrics Panel Max Height

- **File**: `LyricsPanel.tsx:153`
- **Issue**: Max height hardcoded `max-h-72` → cramped di layar besar
- **Fix**: Gunakan `max-h-[60vh]` atau responsive
- **Date**: 2026-06-11

### [x] Preset Overwrite Warning

- **File**: `EqualizerView.tsx:51-58`
- **Issue**: Save preset bisa overwrite tanpa warning
- **Fix**: Tambah konfirmasi jika nama sudah ada
- **Date**: 2026-06-11

### [x] Hex Color Validation

- **File**: `ThemePanel.tsx:198-205`
- **Issue**: Hex color input tanpa validasi ketat
- **Fix**: Validate dengan regex `/^#[0-9A-Fa-f]{6}$/`
- **Date**: 2026-06-11

---

## Accessibility Issues

### [x] Missing Focus Rings

- **Files**: Semua buttons, nav items
- **Issue**: Interactive elements tidak punya focus-visible ring
- **Fix**: Tambah `focus-visible:ring-2 focus-visible:ring-brand-500`
- **Date**: 2026-06-11

### [x] No Keyboard Support

- **Files**: `QueueDrawer`, `QueuePanel`, `TrackList`, `RecommendationCard`
- **Issue**: Interactive elements tidak accessible via keyboard
- **Fix**: Tambah `tabIndex={0}`, `role="button"`, `onKeyDown` handler
- **Date**: 2026-06-11

### [x] Hover-Only Buttons

- **Issue**: Play icons, Remove buttons (`opacity-0 group-hover:opacity-100`)
- **Fix**: Tambah `focus:opacity-100` untuk keyboard users
- **Date**: 2026-06-11

---

## Changelog

### 2026-06-11

- Fixed: All 20 bugs from docs/bug.md — Critical/High (4), Medium (10), Low (4), Accessibility (3)
- Search Input Desync: TopBar & SearchView sync via URL params
- Ghost Playback: pause audio when removing currently playing track
- Favorites Race Condition: proper async/await with loadPlaylist
- Search Concurrency: AbortController cancels stale requests
- Double Save on Enter: renaming flag prevents double commits
- EQ Y-axis Labels: moved to left side with absolute positioning
- Play Similar Silent Fail: loading toast + error handling
- Misleading Recommendation Card: entire card clickable
- Clear History: Trash icon + confirmation modal
- Disable Source While Playing: confirm dialog warning
- Reset Shortcuts: confirmation dialog
- Missing Tooltips: title props on truncated text
- Lyrics Panel: max-h-[60vh] responsive height
- Preset Overwrite: confirm dialog for existing names
- Hex Color Validation: regex + onBlur fallback
- Focus Rings: added focus:opacity-100 to hover-only buttons
- Keyboard Support: proper button elements

### 2026-06-10

- Fixed: Double Media Controls (PlayerBar mini mode)
- Fixed: Search Input Desync (URL sync)
- Fixed: Blank Space layout issue
- Fixed: Dead button More Options in HeroPlayer
