# ✅ Telegram Tasks Mini App

A minimalist personal productivity tracker built as a **Telegram Mini App**. Track daily habits, one-time tasks, quick todos, journal your thoughts, and celebrate your achievements — all inside Telegram.

![Preview](https://img.shields.io/badge/Telegram-Mini%20App-2CA5E0?style=flat&logo=telegram)
![License](https://img.shields.io/badge/license-MIT-green)
![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)

---

## Features

- **📋 Tasks tab** — daily (auto-reset each day) and one-time tasks
- **📅 Day-of-week picker** — set which days a recurring task is active (e.g. gym on Mon/Wed/Fri); today's day dot turns **green** when completed, **red** when not
- **⚡ Mini-tasks tab** — quick lightweight todos
- **🏆 Achievements tab** — history of completed tasks grouped by date; stats show **wins today** and **fail counter** (overdue deadline tasks + daily tasks not done today)
- **💭 Thoughts tab** — diary-style journal with timestamps, grouped by date, long-press to delete
- **📊 Progress bar** — daily completion bar (counts only tasks active today)
- **✏️ Full CRUD** — add, edit, delete everything
- **👆 Swipe to action** — swipe left on any item to reveal Edit / Delete buttons
- **🔔 Haptic feedback** — native Telegram vibration on interactions
- **🎨 Follows Telegram theme** — automatically adapts to light / dark mode and user's color scheme
- **🌐 RU / EN interface** — language switcher in the header, preference saved per-user
- **☁️ Automatic cloud sync** — data stored in Telegram CloudStorage, syncs across all your devices automatically
- **Zero dependencies** — plain HTML + CSS + Vanilla JS

---

## Screenshots

> Open the app in Telegram to see it in action.

---

## Quick Deploy (your own copy)

### 1. Fork & enable GitHub Pages

1. Click **Fork** on this repo
2. Go to `Settings` → `Pages`
3. Set Source to **Deploy from a branch** → `main` → `/ (root)`
4. Save — your app will be live at:
   ```
   https://<your-username>.github.io/tg-tasks-miniapp/
   ```

### 2. Create a Telegram Bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot` — choose a name and username for your bot
3. Save the token BotFather gives you

### 3. Attach the Mini App to your bot

1. In @BotFather send `/newapp`
2. Select your bot
3. Fill in title, description, and set the **Web App URL** to your GitHub Pages link
4. BotFather will give you a direct link like:
   ```
   https://t.me/your_bot/app
   ```

Open that link — the Mini App launches inside Telegram. 🎉

---

## Project Structure

```
tg-tasks-miniapp/
├── index.html   — markup: tabs, modal, nav, context menu
├── styles.css   — all styles using Telegram CSS variables
├── app.js       — all logic: Store, SwipeHandler, Modal, Tabs, I18n, UIThoughts
└── README.md
```

---

## How it works

### Data model

All data is stored in **Telegram CloudStorage** (synced to your Telegram account across devices). The following keys are used:

| Key | Contents |
|-----|----------|
| `tma_tasks_n` + `tma_tasks_0..N` | Chunked array of task objects `{id, title, type, completed, days, createdAt}` |
| `tma_mini_tasks_n` + `tma_mini_tasks_0..N` | Chunked array of mini-task objects `{id, title, completed, createdAt}` |
| `tma_achievements_n` + `tma_achievements_0..N` | Chunked array of completed items `{id, taskId, title, type, completedAt, completedDate}` |
| `tma_thoughts_n` + `tma_thoughts_0..N` | Chunked array of thought entries `{id, text, createdAt}` |
| `tma_last_reset` | Date string `YYYY-MM-DD` of last daily reset |
| `tma_lang` | Interface language: `"ru"` or `"en"` |

> **Chunked storage**: Telegram CloudStorage has a 1024-byte limit per key. Large arrays are automatically split into 800-character chunks (`prefix_0`, `prefix_1`, …) with the count stored in `prefix_n`.

### Daily reset

On every app open, the app compares today's date with `tma_last_reset`.
If the date changed, it sets `completed = false` on all **daily** tasks — they are **never deleted**, only unchecked.

### Day-of-week filter

Each daily task has a `days` array (0 = Mon … 6 = Sun).
Empty array means **every day**. Tasks not scheduled for today are shown in a dimmed "Not today" section and cannot be checked off.

### Language switcher

The **RU / EN** button in the header switches the entire interface language. The preference is saved to CloudStorage and restored on next open.

### Thoughts diary

The Thoughts tab is a simple journal. Each entry is saved with a timestamp and displayed grouped by date. Long-press (or hover on desktop) any entry to reveal a delete button.

---

## Customization

All colors come from Telegram's theme variables — no changes needed for dark/light mode.
To change the accent color, override `--tg-theme-button-color` in `styles.css`.

---

## License

MIT — free to use, fork, and modify.

---

## Author

Made by [@Ilsur6767](https://github.com/Ilsur6767)
