# 🌙 Noor Tab — Islamic New Tab Extension

A beautiful, feature-rich Islamic new tab experience with a glassmorphism design, Unsplash backgrounds, and everything you need for a mindful browsing session.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📖 **Quran Verse of the Day** | Daily ayah with Arabic text, English & Bangla translation, Alafasy audio recitation |
| 🕌 **Live Prayer Times** | Accurate prayer times for any city worldwide with countdown to next prayer |
| 🕐 **Clock & Date** | Elegant 12-hour clock |
| 🔗 **Quick Links** | Add, edit, delete, and drag-to-reorder your favourite sites with favicon icons |
| 📁 **Browser Bookmarks** | Your Chrome bookmarks displayed in glassmorphism style |
| 🤲 **Dhikr Reminders** | Timed popup reminders on every page you browse |
| ☪ **Salah Tracker** | Track your 5 daily prayers with a streak counter |
| 🎯 **Habit Tracker** | Build and maintain daily habits |
| ❤️ **Favourite Verses** | Save and revisit your favourite Quran verses |
| 📝 **Quick Notes** | Persistent scratchpad always one click away |
| 📊 **Site Usage Stats** | Daily bar chart of time spent on each website |
| 💾 **Backup & Restore** | Export / import all your data as a JSON file |
| 🖼️ **Unsplash Backgrounds** | Auto-fetched photos by category, cached to save API quota |
| 🎨 **5 Themes** | Dark, Light (warm), AMOLED Black, Ocean Depths, Forest |
| ⚙️ **Full Customisation** | Icon size, icons per row, layout split, visibility toggles, blur intensity |

---

## 📦 Installation

### Chrome / Edge / Brave (MV3)

1. Download the zip and unzip it
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer Mode** (top-right toggle)
4. Click **"Load unpacked"**
5. Select the `noor_tab_fixed/` folder
6. Open a new tab — enjoy! 🎉

### Firefox (MV2)

1. Rename `manifest_firefox.json` → `manifest.json` (replace the existing one)
2. Open Firefox → `about:debugging`
3. Click **"This Firefox"** → **"Load Temporary Add-on…"**
4. Select any file inside the folder
5. Open a new tab — enjoy! 🎉

---

## ⚙️ Setup Tips

- **Prayer times:** Click the 📍 pin icon on the prayer card and enter your city name
- **Unsplash backgrounds:** Get a free Access Key at [unsplash.com/developers](https://unsplash.com/developers) and paste it in Settings
- **Dhikr reminders:** Enable in Settings → Dhikr Reminder, choose your interval (5–60 min)
- **Backup your data:** Settings → Backup & Restore → Export Backup

---

## 🔒 Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Save your links, settings, prayer times, notes, habits |
| `tabs` | Track site usage stats |
| `bookmarks` | Display your browser bookmarks |
| `alarms` | Dhikr reminder timing |
| `geolocation` | Optional: detect your location for prayer times |
| `scripting` | Send Dhikr reminders to all open pages |

---

## 👤 Author

Made with ❤️ by [Tasneem Sahat](https://www.facebook.com/t4sn33m.s4h4t/)
