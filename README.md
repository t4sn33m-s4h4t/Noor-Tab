# 🌙 Noor Tab — Islamic New Tab

> A beautiful, feature-rich Islamic new tab extension for Chrome. Replace your default new tab with a spiritually enriching experience — Quran verse of the day, prayer times, Salah tracker, habit tracking, browser lock, and much more.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-brightgreen?logo=google-chrome)](https://chromewebstore.google.com/detail/noor-tab-%E2%80%94-islamic-new-ta/ldgpcichhcjigfnebabgddfodbmeccac)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue)](https://github.com/)
[![Manifest](https://img.shields.io/badge/Manifest-V3-orange)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/License-MIT-purple)](LICENSE)

---

## 📥 Install

**[→ Add to Chrome from the Web Store](https://chromewebstore.google.com/detail/noor-tab-%E2%80%94-islamic-new-ta/ldgpcichhcjigfnebabgddfodbmeccac)**

Or load locally for development — see [Local Setup](#-local-setup) below.

---

## ✨ Features

### 📖 Quran Verse of the Day
- Displays a daily Quran verse with Arabic text, English translation, and Bangla translation
- Listen to the verse recited by Sheikh Mishary Alafasy
- Reload for a different verse at any time
- Save favourite verses with the ❤️ button
- Saved verses include a play button to listen to each one individually
- Choose which languages are displayed and which are saved to favourites
- Verse changes daily, weekly, or manually — your choice

### 🕌 Prayer Times
- Accurate prayer times fetched from [Aladhan API](https://aladhan.com)
- Set your location by city name or use GPS auto-detection
- Live countdown to the next prayer
- Displays all 5 daily prayers with current/next highlighted

### 🧎 Salah Tracker
- Track your 5 daily prayers with a single tap
- 🔥 Streak counter that resets if you miss a full day
- Visual progress bar and missed prayer indicators
- Automatically resets at midnight

### ✅ Habit Tracker
- Add unlimited custom habits with emoji icons
- Daily check-in with one tap
- 30-day heatmap for each habit
- Current streak, best streak, and 30-day completion stats

### 🔗 Quick Links
- Add, edit, and remove favourite website shortcuts
- Drag and drop to reorder
- Auto-fetches favicons, with custom icon URL support
- Tabs for Quick Links and Browser Bookmarks

### 📝 Quick Notes
- Persistent scratchpad that saves automatically
- Character and word count
- Press the 📝 button or shortcut to open/close

### 🔍 Floating Search Bar
- Sits between the Quran section and links as a floating bar
- Live search suggestions powered by DuckDuckGo autocomplete
- Switch search engine in Settings: Google, YouTube, DuckDuckGo, Bing
- Press **`/`** anywhere on the page to instantly focus the search bar
- Click the search icon or press Enter to search

### 📊 Site Usage Stats
- Tracks daily time spent per website in the background
- Beautiful bar chart updated in real time
- Resets automatically at midnight

### 🔒 Browser Lock
- Full browser lock — locks all windows on startup or when Chrome closes
- Blank lock screen with auto-focused hidden password field (nothing visible — only you know to type your password)
- Correct password auto-unlocks and restores all your previous tabs and windows
- Press **F1** on the lock screen to answer security questions if you forget your password
- Manage your password and security questions via **Settings → Lock**

### 🎨 Themes
9 built-in themes: **Dark**, **Light**, **AMOLED**, **Ocean**, **Forest**, **Sunset**, **Nord**, **Rose Gold**, **Solarized**

### 🖼️ Unsplash Backgrounds
- Beautiful photography backgrounds from [Unsplash](https://unsplash.com)
- Set any search category (nature, architecture, Islamic, space…)
- Configure how often the image changes, including on every new tab open
- Manual reload button to get a new image instantly
- Requires a free Unsplash API key

### ↔️ Mirror Layout
- Flip the entire layout left-to-right with one toggle
- Moves all panels, buttons, and sidebars to the opposite side

### 👁️ Visibility Controls
- Toggle any element on or off: clock, search bar, Quran section, prayer times, stats, links, Salah/Habits buttons, Notes, Favourite Verses

### 💾 Backup & Restore
- Export all your data (settings, links, notes, habits, saved verses) as a JSON file
- Restore from backup at any time

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus the search bar |
| `Escape` | Close open panels / modals |
| `Enter` | Submit search or confirm |
| `F1` *(on lock screen)* | Start forgot-password flow |

---

## 🛠️ Local Setup

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `noor_tab_v2` folder
6. Open a new tab — Noor Tab is live 🎉

---

## 🔑 Unsplash API Setup

To enable background images:

1. Go to [unsplash.com/developers](https://unsplash.com/developers) and create a free account
2. Create a new application
3. Copy your **Access Key**
4. In Noor Tab → **Settings → Background** → paste your key
5. Set a search category and interval

---

## 🏗️ Project Structure

```
noor_tab_v2/
├── manifest.json           # MV3 manifest
├── newtab.html             # Main new tab page
├── css/
│   ├── main.css            # All styles + 9 themes
│   ├── fonts.css           # Local Poppins font faces
│   └── lock.css            # Lock screen styles
├── fonts/                  # Bundled Poppins woff2 files (local, no CDN)
├── icons/                  # Extension icons
├── js/
│   ├── storage.js          # Chrome storage abstraction
│   ├── components.js       # Shared UI: modals, toasts, confirms
│   ├── main.js             # App orchestration, sidebar logic
│   ├── settings.js         # All settings + live preview
│   ├── background.js       # Service worker: stats + browser lock
│   ├── background_img.js   # Unsplash background loader
│   ├── clock.js            # Clock + date display
│   ├── quran.js            # Quran verse, audio, favourites
│   ├── salah.js            # Salah tracker
│   ├── habits.js           # Habit tracker
│   ├── prayer_times.js     # Prayer times + countdown
│   ├── links.js            # Quick links with drag-reorder
│   ├── bookmarks.js        # Browser bookmarks
│   ├── notes.js            # Quick notes
│   ├── search.js           # Search bar + suggestions
│   ├── stats.js            # Site usage stats
│   ├── lock.js             # Lock settings page opener
│   └── lockscreen.js       # Lock screen password logic
└── pages/
    ├── lockscreen.html     # Blank browser lock screen
    ├── lock-settings.html  # Password + security questions
    └── popup.html          # Extension toolbar popup
```

---

## 🔒 Privacy

- **No data is ever sent to any server.** All your notes, habits, links, Salah data, and settings are stored locally in `chrome.storage.local` on your own device.
- The only outbound requests are:
  - **Quran API** (`api.alquran.cloud`) — to fetch verse text
  - **Audio** (`everyayah.com`, `cdn.islamic.network`) — to stream recitation
  - **Prayer times** (`api.aladhan.com`) — to fetch prayer schedule
  - **Geocoding** (`nominatim.openstreetmap.org`) — to resolve city names to coordinates
  - **Unsplash** (`api.unsplash.com`) — to fetch background images (only if you add an API key)
  - **Favicons** (`google.com/s2/favicons`) — to show link icons
  - **Search suggestions** (`duckduckgo.com/ac`) — for search autocomplete
- All these are **data requests only** — no code is ever fetched or executed remotely (fully MV3 compliant).

---

## 🧰 Tech Stack

- **Vanilla JavaScript** (ES2020+) — no frameworks, no build tools
- **Chrome Extension Manifest V3** — service worker architecture
- **CSS custom properties** — for theming and glassmorphism
- **Web Crypto API** — for browser lock password hashing (SHA-256)
- **chrome.storage.local** — for all persistent data

---

## 🙏 Credits & APIs

| Service | Purpose |
|---------|---------|
| [AlQuran Cloud](https://alquran.cloud) | Quran verse text (Arabic, English, Bangla) |
| [EveryAyah](https://everyayah.com) | Alafasy audio recitation |
| [Aladhan](https://aladhan.com) | Prayer times calculation |
| [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org) | City geocoding |
| [Unsplash](https://unsplash.com) | Background photography |
| [DuckDuckGo](https://duckduckgo.com) | Search suggestions |
| [Google Favicons](https://google.com/s2/favicons) | Quick link icons |
| Poppins (Google Fonts, bundled locally) | UI typography |

---

## 👩‍💻 Author

Made with ❤️ by **Tasneem Sahat**

---

## 📄 License

MIT — feel free to fork, modify, and build on top of this project.
