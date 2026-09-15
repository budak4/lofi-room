# Lo-Fi Virtual Study Room — iOS 26 Liquid Glass Vibe

> Lo-Fi Study & Chill Room — kamar santai estetik lo-fi dengan **Apple liquid glass (iOS 26 vibe)** powered by **`quick-liquid`**.

---

## Instalasi

```bash
npm install quick-liquid
```

Kemudian jalankan project (Vite):

```bash
npm install
npm run dev        # development: http://localhost:5173
npm run build      # production build → dist/
npm run preview    # pratonton hasil build
```

> Diperlukan Node 18+.

---

## Cara `quick-liquid` diguna
`src/main.js` mengimport engine dan utiliti, kemudian melekat pada elemen DOM:

```js
import { LiquidGlassEngine, LiquidButton, LiquidTabBar, LiquidMorph } from 'quick-liquid';

// 1) Semua elemen .glass jadi permukaan kaca cair (refraktif + chromatic)
new LiquidGlassEngine(el, {
  material: 'regular',
  refractionStrength: 22,
  chromaticAberration: 0.2,
  dynamicLighting: true,   // rim light ikut kursor
  parallax: true,
});

// 2) Butang dgn spring press/squish
new LiquidButton(btn).onTap(cb);

// 3) Dock indicator morph (indikator kaca cair bergerak antara tab)
new LiquidTabBar(dock, items, { spring: 'snappy' });

// 4) Mobile morph/jiggle utk hotspot kaca
new LiquidMorph(el, { spring: 'bouncy' });
```

Semua glass ini **tanpa stylesheet import** — lib handle refraction, rim lighting,
warna dispersion, dan fallback `backdrop-filter` untuk enjin lain.

---

## Fitur

### 🪟 Interactive Hotspots (bilik)
Klik objek dalam bilik: lampu meja (mood hangat/dingin), radio (main musik),
pokok (riak), **bulan** = tukar cuaca (cerah → hujan), kucing (miau).

### 🍅 Pomodoro Timer
Panel kaca melayang di tengah: preset 25/50/90, mode fokus/rehat, skip auto,
cincin progress hidup, sejarah 🍅.

### 🎧 Lo-Fi Music Player
Musik **dijana sepenuhnya dengan Web Audio API** (tanpa fail audio):
chord progresif lo-fi, kick/hat, bass, vinil noise. Ada 5 "track", gelombang
equalizer animasi, mini-player melayang di pojok.

### ✔️ To-Do List
Tambah/semak/padam tugasan, progress bar, simpan dalam `localStorage`.

### ⌛ Status bar & Dock
Jam + sapaan kontekstual, dock bawah dengan indikator kaca cair morph
(`LiquidTabBar`) untuk tukar antara Home · Fokus · Playlist · To-Do.

---

## Deploy ke GitHub Pages

Repo ini auto-deploy ke **branch `gh-pages`**. Site live di:
`https://budak4.github.io/lofi-room/`

## Stack
- [quick-liquid](https://www.npmjs.com/package/quick-liquid) — liquid glass engine
- Vite — bundler
- Vanilla JS — tiada framework wajib (lib sedia support React juga)