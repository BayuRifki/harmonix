# 🎵 Algoritma Rekomendasi Music Player

> Panduan implementasi algoritma rekomendasi lagu untuk Electron Music Player menggunakan yt-dlp.  
> Cocok untuk kebutuhan pribadi dan riset.

---

## 📋 Daftar Isi

1. [Gambaran Umum](#gambaran-umum)
2. [Content-Based Filtering](#1-content-based-filtering)
3. [Collaborative Filtering](#2-collaborative-filtering-history)
4. [Session-Based Filtering](#3-session-based--context-aware)
5. [Mood Detection](#4-mood-detection)
6. [Hybrid Algorithm](#5-hybrid-algorithm-rekomendasi-terbaik)
7. [Arsitektur Sistem](#arsitektur-sistem)

---

## Gambaran Umum

Algoritma rekomendasi yang baik menggabungkan **3 sinyal utama**:

| Sinyal | Sumber Data | Bobot |
|---|---|---|
| Content-Based | Fitur lagu saat ini (tags, judul, artist) | 40% |
| Session-Based | Pola lagu dalam sesi sekarang | 35% |
| History-Based | Kebiasaan dengar jangka panjang | 25% |

---

## 1. Content-Based Filtering

Rekomendasikan lagu berdasarkan **kesamaan konten** dari lagu yang sedang diputar (genre, tags, artist, mood).

### Cara Kerja
- Ambil metadata lagu (tags, judul, uploader) via yt-dlp
- Gunakan data tersebut sebagai query pencarian lagu serupa

### Implementasi

```javascript
// main.js
ipcMain.handle('get-related', async (_, videoId) => {
  // Ambil info lagu saat ini
  const results = await ytDlp.execPromise([
    `https://www.youtube.com/watch?v=${videoId}`,
    '--dump-json',
    '--no-warnings'
  ]);

  const info = JSON.parse(results);

  // Gunakan tags atau judul sebagai query
  const tags = info.tags?.slice(0, 3).join(' ') || info.title;

  // Cari lagu dengan konten serupa
  const related = await ytDlp.execPromise([
    `ytsearch10:${tags}`,
    '--dump-json',
    '--flat-playlist',
    '--no-warnings'
  ]);

  return related.trim().split('\n').map(line => JSON.parse(line));
});
```

### Kelebihan & Kekurangan

| ✅ Kelebihan | ❌ Kekurangan |
|---|---|
| Tidak butuh data user lain | Terbatas pada kesamaan metadata |
| Relevan dengan lagu saat ini | Bisa terlalu sempit (kurang eksplorasi) |
| Mudah diimplementasikan | Bergantung pada kualitas tags YouTube |

---

## 2. Collaborative Filtering (History)

Rekomendasikan berdasarkan **pola kebiasaan pendengar** — lagu apa yang paling sering diputar.

### Cara Kerja
- Simpan riwayat lagu yang diputar ke file lokal
- Analisis frekuensi tags/artist
- Gunakan data tersebut untuk query rekomendasi

### Implementasi

```javascript
// history.js
const fs = require('fs');
const HISTORY_FILE = 'history.json';

// Simpan lagu ke history
function saveHistory(track) {
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE));
  }
  history.push({
    id: track.id,
    title: track.title,
    uploader: track.uploader,
    tags: track.tags || [],
    playedAt: Date.now()
  });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// Ambil tags yang paling sering muncul
function getMostPlayedTags(history, topN = 5) {
  const freq = {};
  history.forEach(track => {
    (track.tags || []).forEach(tag => {
      freq[tag] = (freq[tag] || 0) + 1;
    });
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([tag]) => tag);
}

// Ambil artist favorit
function getMostPlayedArtists(history, topN = 3) {
  const freq = {};
  history.forEach(track => {
    const artist = track.uploader;
    if (artist) freq[artist] = (freq[artist] || 0) + 1;
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([artist]) => artist);
}

module.exports = { saveHistory, getMostPlayedTags, getMostPlayedArtists };
```

### Kelebihan & Kekurangan

| ✅ Kelebihan | ❌ Kekurangan |
|---|---|
| Makin akurat seiring waktu | Butuh data history yang cukup |
| Mencerminkan selera user | Cold start (awal pakai belum akurat) |
| Personalisasi tinggi | Bisa terjebak di zona nyaman |

---

## 3. Session-Based / Context-Aware

Rekomendasikan berdasarkan **konteks sesi saat ini** — lagu apa yang diputar berurutan dalam sesi ini.

### Cara Kerja
- Simpan lagu yang diputar dalam sesi (in-memory, reset tiap buka app)
- Analisis artist/genre dominan di sesi ini
- Cari lagu yang cocok dengan suasana sesi

### Implementasi

```javascript
// session.js

// Sesi saat ini (in-memory, reset saat app ditutup)
let currentSession = [];

// Tambahkan lagu ke sesi
function addToSession(track) {
  currentSession.push(track);
  // Hanya simpan 10 lagu terakhir
  if (currentSession.length > 10) {
    currentSession.shift();
  }
}

// Bangun query berdasarkan sesi
function buildSessionQuery() {
  if (currentSession.length === 0) return null;

  // Hitung frekuensi artist di sesi ini
  const artistFreq = {};
  currentSession.forEach(track => {
    const artist = track.uploader;
    if (artist) artistFreq[artist] = (artistFreq[artist] || 0) + 1;
  });

  // Ambil artist paling dominan
  const topArtist = Object.entries(artistFreq)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  // Ambil lagu terakhir untuk konteks
  const lastTrack = currentSession[currentSession.length - 1];

  return `${topArtist} ${lastTrack?.tags?.[0] || ''} similar songs`.trim();
}

// Reset sesi
function clearSession() {
  currentSession = [];
}

// Ambil ID lagu yang sudah diputar (untuk filter duplikat)
function getPlayedIds() {
  return new Set(currentSession.map(t => t.id));
}

module.exports = { addToSession, buildSessionQuery, clearSession, getPlayedIds };
```

### Kelebihan & Kekurangan

| ✅ Kelebihan | ❌ Kekurangan |
|---|---|
| Responsif terhadap mood saat ini | Tidak ingat preferensi jangka panjang |
| Cocok untuk sesi mendengarkan tertentu | Reset setiap sesi baru |
| Tidak perlu storage permanen | Butuh minimal 2-3 lagu untuk akurat |

---

## 4. Mood Detection

Deteksi mood dari judul dan tags lagu, lalu sesuaikan rekomendasi.

### Kategori Mood

| Mood | Kata Kunci |
|---|---|
| 😊 Happy | happy, joy, fun, party, upbeat, dance |
| 😢 Sad | sad, cry, heartbreak, alone, miss, hurt |
| 😌 Chill | chill, relax, lofi, calm, sleep, study |
| 🔥 Hype | hype, energy, workout, gym, beast, fire |
| ❤️ Romantic | love, romance, together, sweet, tender |

### Implementasi

```javascript
// mood.js

const MOODS = {
  happy:    ['happy', 'joy', 'fun', 'party', 'upbeat', 'dance', 'celebrate'],
  sad:      ['sad', 'cry', 'heartbreak', 'alone', 'miss', 'hurt', 'lonely'],
  chill:    ['chill', 'relax', 'lofi', 'calm', 'sleep', 'study', 'acoustic'],
  hype:     ['hype', 'energy', 'workout', 'gym', 'beast', 'fire', 'power'],
  romantic: ['love', 'romance', 'together', 'sweet', 'tender', 'kiss'],
};

function detectMood(title = '', tags = []) {
  const text = `${title} ${tags.join(' ')}`.toLowerCase();
  let topMood = 'chill'; // default
  let topScore = 0;

  for (const [mood, keywords] of Object.entries(MOODS)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > topScore) {
      topScore = score;
      topMood = mood;
    }
  }
  return topMood;
}

// Buat query berdasarkan mood
function buildMoodQuery(mood, artist = '') {
  const moodQueries = {
    happy:    'happy upbeat songs',
    sad:      'sad emotional songs',
    chill:    'chill relax lofi',
    hype:     'hype energy music',
    romantic: 'romantic love songs',
  };
  return `${moodQueries[mood] || 'music'} ${artist}`.trim();
}

module.exports = { detectMood, buildMoodQuery };
```

---

## 5. Hybrid Algorithm (Rekomendasi Terbaik)

Gabungkan semua pendekatan di atas dengan **sistem scoring berbobot**.

### Bobot Sinyal

```
Content-Based  ████████░░  40%
Session-Based  ███████░░░  35%
History-Based  █████░░░░░  25%
```

### Implementasi Lengkap

```javascript
// recommender.js
const { getMostPlayedTags } = require('./history');
const { buildSessionQuery, getPlayedIds } = require('./session');
const { detectMood, buildMoodQuery } = require('./mood');

const WEIGHTS = {
  contentBased: 0.4,
  sessionBased: 0.35,
  historyBased: 0.25,
};

// Helper: search YouTube via yt-dlp
async function searchYT(ytDlp, query, limit = 10) {
  try {
    const results = await ytDlp.execPromise([
      `ytsearch${limit}:${query}`,
      '--dump-json',
      '--flat-playlist',
      '--no-warnings'
    ]);
    return results.trim().split('\n').map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

// Fungsi utama rekomendasi
async function getRecommendations(ytDlp, currentTrack, history) {
  const scores = {};
  const allTracks = {};

  // --- 1. Content-Based ---
  const mood = detectMood(currentTrack.title, currentTrack.tags);
  const contentQuery = buildMoodQuery(mood, currentTrack.uploader);
  const contentResults = await searchYT(ytDlp, contentQuery, 10);

  contentResults.forEach((track, i) => {
    scores[track.id] = (scores[track.id] || 0) +
      WEIGHTS.contentBased * (1 - i / 10);
    allTracks[track.id] = track;
  });

  // --- 2. Session-Based ---
  const sessionQuery = buildSessionQuery();
  if (sessionQuery) {
    const sessionResults = await searchYT(ytDlp, sessionQuery, 10);
    sessionResults.forEach((track, i) => {
      scores[track.id] = (scores[track.id] || 0) +
        WEIGHTS.sessionBased * (1 - i / 10);
      allTracks[track.id] = track;
    });
  }

  // --- 3. History-Based ---
  const topTags = getMostPlayedTags(history, 5);
  if (topTags.length > 0) {
    const historyResults = await searchYT(ytDlp, topTags.join(' '), 10);
    historyResults.forEach((track, i) => {
      scores[track.id] = (scores[track.id] || 0) +
        WEIGHTS.historyBased * (1 - i / 10);
      allTracks[track.id] = track;
    });
  }

  // --- Filter & Sort ---
  const playedIds = getPlayedIds();

  return Object.entries(scores)
    .filter(([id]) => !playedIds.has(id))          // Hapus yang sudah diputar
    .filter(([id]) => id !== currentTrack.id)       // Hapus lagu saat ini
    .sort((a, b) => b[1] - a[1])                    // Urutkan skor tertinggi
    .slice(0, 10)                                    // Ambil top 10
    .map(([id]) => allTracks[id]);                  // Kembalikan data track
}

module.exports = { getRecommendations };
```

### Integrasi ke main.js

```javascript
// main.js (tambahan)
const { getRecommendations } = require('./recommender');
const { saveHistory, getMostPlayedTags } = require('./history');
const { addToSession } = require('./session');
const fs = require('fs');

// Saat lagu diputar
ipcMain.handle('play-track', async (_, track) => {
  addToSession(track);
  saveHistory(track);
  return await getStreamUrl(track.id); // fungsi get-stream-url sebelumnya
});

// Dapatkan rekomendasi
ipcMain.handle('get-recommendations', async (_, currentTrack) => {
  const history = fs.existsSync('history.json')
    ? JSON.parse(fs.readFileSync('history.json'))
    : [];
  return await getRecommendations(ytDlp, currentTrack, history);
});
```

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────┐
│              Lagu Sedang Diputar             │
└─────────────────┬───────────────────────────┘
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
┌──────────┐ ┌─────────┐ ┌──────────┐
│ Content  │ │ Session │ │ History  │
│  Based   │ │  Based  │ │  Based   │
│  (40%)   │ │  (35%)  │ │  (25%)   │
└────┬─────┘ └────┬────┘ └────┬─────┘
     │             │           │
     └─────────────┼───────────┘
                   ▼
         ┌─────────────────┐
         │  Scoring Engine │
         │  (Bobot Sinyal) │
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ Filter Duplikat │
         │ & Sudah Diputar │
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │  Top 10 Lagu    │
         │  Rekomendasi    │
         └─────────────────┘
```

---

## 📁 Struktur File yang Disarankan

```
electron-music-player/
├── main.js                 # Entry point Electron
├── preload.js              # Bridge renderer ↔ main
├── recommender.js          # Hybrid algorithm utama
├── history.js              # Manajemen riwayat dengar
├── session.js              # Manajemen sesi saat ini
├── mood.js                 # Deteksi mood lagu
├── history.json            # Data riwayat (auto-generated)
├── renderer/
│   ├── index.html
│   ├── app.js
│   └── style.css
└── yt-dlp                  # Binary yt-dlp
```

---

## 🚀 Tips Pengembangan Lanjutan

1. **Simpan skor ke SQLite** — agar rekomendasi makin akurat seiring waktu
2. **Tambahkan rating** — beri user opsi 👍/👎 untuk fine-tuning bobot
3. **Cache stream URL** — URL dari yt-dlp expire, simpan dengan timestamp
4. **Gunakan Last.fm API** — untuk data tag musik yang lebih akurat dari metadata YouTube
5. **Tambahkan fitur skip tracking** — lagu yang sering di-skip bobotnya dikurangi

---

> 💡 **Catatan:** Akurasi algoritma akan meningkat seiring bertambahnya data history. Minimal butuh **20-30 lagu** di history agar rekomendasi mulai terasa personal.
