# Play with friends — SIM / phone hotspot only

No home Wi‑Fi needed. Use your **phone SIM** as a mini Wi‑Fi router.

## How it works

```
Your phone (hotspot ON, SIM)
    ├── Your laptop  → runs the game server
    └── Friends' phones → open the game in browser
```

Traffic between phones stays on the **local hotspot**. Almost **no extra SIM data** is used for gameplay (only a tiny bit when the hotspot starts).

---

## Step-by-step

### 1. Host setup (you)

1. Turn on **Personal Hotspot** on your phone  
   - iPhone: Settings → Personal Hotspot  
   - Android: Settings → Hotspot & tethering → Wi‑Fi hotspot  

2. Connect your **laptop** to that hotspot Wi‑Fi  

3. On the laptop, run:

```powershell
cd "d:\Project\game tien len"
npm run dev:hotspot
```

4. Note the link printed in the terminal, e.g.:

```
Share this link:  http://192.168.43.5:3000
```

### 2. Friends join

1. Friends connect to **the same phone hotspot** Wi‑Fi  
2. Open Chrome/Safari on their phone  
3. Go to the link you shared (e.g. `http://192.168.43.5:3000`)  
4. Tap **Play as Guest** → enter nickname → Create or Join room  

### 3. Share room

- Copy **invite link** or **room code** inside the app  
- Send in Messenger / Telegram (can be offline message — they need hotspot to play)

---

## Limits

| Topic | Detail |
|-------|--------|
| **Distance** | Friends must be close enough for your hotspot (usually same room) |
| **Players** | Phone hotspot: about **5–8 devices** max |
| **No SIM at all** | Multiplayer needs a network — use hotspot from any phone with data |
| **Far-away friends** | Need cloud server + everyone's SIM data — not this guide |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Friends can't open link | Same hotspot Wi‑Fi? Windows Firewall → allow Node on private network |
| Wrong IP shown | Set manually: `$env:LAN_HOST="192.168.43.5"; npm run dev:hotspot` |
| Page loads but login fails | Restart `npm run dev:hotspot` after connecting to hotspot |
| Laptop has no hotspot IP | Connect laptop to phone hotspot **before** starting the server |

### Allow through Windows Firewall (once)

When Windows asks about **Node.js** / **Private networks** → click **Allow**.

---

## Commands

| Command | Use |
|---------|-----|
| `npm run dev:hotspot` | Play with friends on phone Wi‑Fi |
| `npm run dev:local` | Only you on this PC (`localhost`) |
