# Dekho Party — P2P Watch Party for Dekho Prime

> Dedicated Web Application for **`party.dekhoprime.live`**  
> Watch movies, shows, and streams together with friends in real-time with synchronized playback and peer-to-peer live chat.

---

## 🚀 Key Features

1. **True Peer-to-Peer (WebRTC & PeerJS):**
   - Direct browser-to-browser connection with **zero server storage/bandwidth costs**.
   - Backed by Google STUN servers for high NAT traversal success rates.

2. **Synchronized Playback Engine:**
   - **Play / Pause / Seek Sync:** When the host or a participant plays, pauses, or seeks, all connected peers sync instantly.
   - **Heartbeat & Drift Correction:** Automatically detects time drift (>1.8s) and smoothly aligns playback timestamps.
   - **Buffer State Awareness:** Real-time indicator (`Friend buffering...`) so users know when their peer is waiting on slow connections.

3. **Live Chat & Interactive Floating Reactions:**
   - Real-time text messaging over P2P DataChannels.
   - Floating emoji reactions (❤️, 😂, 🍿, 🔥, 😮, 👏) that burst across both screens.
   - Fullscreen celebration confetti (🎉).

4. **Permissions & Host Control:**
   - **Host Only Controls:** Host can lock playback controls to prevent accidental seeking by viewers.
   - **Open Controls:** Allow all viewers to pause or seek anytime.

5. **Universal Video Support:**
   - Native HLS (`.m3u8`) via `Hls.js`.
   - Direct MP4 / WebM / FTP video sources.
   - Third-party Embed / iFrame support with synchronized "3-2-1 Play" ready timer.

---

## 🛠️ Local Development

```bash
# Navigate to the party app directory
cd party

# Install dependencies (already installed)
npm install

# Start Vite dev server on port 5174
npm run dev
```

Open: [http://localhost:5174](http://localhost:5174)

---

## 🌐 Deployment to `party.dekhoprime.live`

### Option 1: Cloudflare Pages (Recommended)
1. Push this directory or create a separate repository for `party/`.
2. In Cloudflare Dashboard -> **Workers & Pages** -> **Create application** -> **Pages**.
3. Set **Build command**: `npm run build`
4. Set **Build output directory**: `dist`
5. Set Root directory (if in monorepo): `party`
6. Add Custom Domain: `party.dekhoprime.live`.
*(Note: `public/_redirects` is already included for SPA routing)*

### Option 2: Vercel
1. Import repository and set root directory to `party`.
2. Framework Preset: **Vite**.
3. Custom Domain: `party.dekhoprime.live`.
*(Note: `vercel.json` rewrite rule is already configured)*

---

## 🔗 URL Query Parameters

You can launch a party room directly using URL parameters:

| Parameter | Example | Purpose |
| :--- | :--- | :--- |
| `room` | `?room=party-xyz123` | Direct join into existing room |
| `stream` | `?stream=https://example.com/movie.m3u8` | Pre-load stream URL into player |
| `title` | `?title=Inception` | Media title shown in room header |
| `poster` | `?poster=https://example.com/poster.jpg` | Video poster image |
