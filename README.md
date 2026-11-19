# ⚡ LudoZ — Ludo Zaman Now

Game web Ludo modern dengan **Hero Skill Overdrive**, **Tactical Dice Loadout**, **4 Efek KO Sinematik**, **Tema Nusantara Cyberpunk & Neo-Arcade**, **Dynamic Board Events**, dan **Multiplayer Online Real-Time** (tanpa dependency eksternal!).

## ✨ Fitur Utama

- **🎲 Aturan Wajib Dadu 6 Keluar Markas:** Semua pion mulai di markas dan hanya keluar saat melempar angka **6** (plus Bonus Turn).
- **🇮🇩 Tema Custom (Live Switcher):**
  - **Nusantara Cyberpunk:** Papan motif Batik Kawung Neon, inti finis Gunungan Cyber, & Hero **Garuda-01**, **Barong-X**, **Macan-V**, **Naga-99**.
  - **Neo-Arcade:** Cyber Grid Neon & Hero **Kitsune**, **Titan-X**, **Sparky**, **Phantom**.
- **💥 4 Efek KO Khusus (Canvas FX + Web Audio Synth):**
  - `Cyber Laser / Glitch Beam` (Garuda-01 / Kitsune)
  - `Meteor Impact` (Barong-X / Titan-X)
  - `Petir Kilat` (Macan-V / Sparky)
  - `Black Hole Implosion` (Naga-99 / Phantom)
- **🎒 Tactical Dice & Power-Hold Roll:** Dadu Standar, Ganjil (`1/3/5`), Chaos (`0–8 / 💀-2`), Magnet (`±1 KO`), Genap (`2/4/6` + 2 pion), & Slime Trap.
- **🚨 Dynamic Board Events & Mystery Box:** Portal Shift, Turbo Lane, Blackout Mode, Energy Surge, Reverse Uno, & EMP Shock.
- **🎨 Arena & Skin (tab baru di Lobby):** 4 peta (Batik Kawung, Cyber Grid, Candi Senja, Samudra Abyss), 4 skin pion (Orb Hero, Bidak Klasik, Kristal Prisma, Chip Arcade), 5 skin dadu (Neon Core, Gading Klasik, Hologram, Emas 24K, Batik Sogan). Tersimpan di browser & bersifat lokal.
- **⏳ Loading Screen:** splash saat buka game + layar "masuk arena" sebelum match (dadu 3D berputar, pion mengorbit, lineup hero VS, progress & tips).
- **✏️ Ikon SVG penuh:** semua UI memakai ikon SVG (`src/icons.js`) — tidak ada emoji di dalam game. Logo & favicon ada di `assets/` (vektor, dibuat dari `src/logo.js`).
- **🌐 Multiplayer Online Real-Time:** Buat/Gabung Room 4 huruf + Link Invite (`/?room=XXXX`) via built-in SSE + REST server di `server.mjs`.

## 🚀 Cara Menjalankan

Pastikan Node.js terpasang, lalu jalankan:

```bash
npm start
```

Buka browser di **http://localhost:5173** (atau bagikan URL LAN yang tampil di terminal untuk mabar 1 Wi-Fi).
