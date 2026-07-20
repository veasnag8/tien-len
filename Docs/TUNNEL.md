# Internet play (no hotspot) — free

Play on **phone from anywhere** using mobile data or Wi‑Fi.  
**$0** — uses Cloudflare Tunnel.

## Run

```powershell
cd "d:\Project\game tien len"
npm install
npm run dev:tunnel
```

Wait until you see:

```
Share this link:  https://xxxx.trycloudflare.com
```

Send that link to friends (Messenger / Zalo).  
They open on phone → enter name → play.

## Notes

| | |
|---|---|
| Cost | Free |
| Hotspot | **Not needed** |
| Phone | ✅ Works |
| Anywhere | ✅ (with internet) |
| Laptop | Must stay **on** while playing |
| Link | **Changes** each time you restart |

## Privacy

- Only people with the link can join
- No public listing
- Share link only with friends

## Commands

| Command | Use |
|---------|-----|
| `npm run dev:tunnel` | Internet / anywhere (SIM or Wi‑Fi) |
| `npm run dev:hotspot` | Same room, no internet tunnel |
| `npm run dev:local` | Only you on this PC |

## Troubleshooting

- **Tunnel URL not shown** — wait 1–2 minutes; check internet on PC
- **502 error** — wait for backend to finish starting, refresh page
- **First load slow** — normal on free tunnel
