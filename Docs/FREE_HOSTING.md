# Free hosting — phone only (no PC)

Play from phone anywhere. **No credit card** for the free tiers below.

```
Phone → Vercel (website)
       → Render (API + WebSocket)
       → Neon (PostgreSQL)
       → Upstash (Redis)
```

---

## 1. Neon (database)

1. Open https://neon.tech → Sign up with GitHub  
2. Create project: name `tienlen`, region **Singapore**  
3. Copy **Connection string** (looks like `postgresql://...@....neon.tech/neondb?sslmode=require`)

---

## 2. Upstash (Redis)

1. Open https://upstash.com → Sign up with GitHub  
2. Create Redis database: name `tienlen`, region **Singapore**  
3. Copy **REDIS_URL** (use `rediss://...` if shown)

---

## 3. Render (backend)

1. Open https://render.com → Sign up with GitHub  
2. **New → Blueprint** → connect repo `veasnag8/tien-len`  
   - Or **New → Web Service** → same repo  
3. If manual Web Service:

| Field | Value |
|-------|--------|
| Root Directory | *(leave empty — repo root)* |
| Runtime | Node |
| Build Command | `npm install && npm run build -w Shared && npm run build -w Socket && npm run prisma:generate -w Backend && npm run build -w Backend` |
| Start Command | `npm run start:cloud -w Backend` |
| Instance | **Free** |

4. Environment variables:

```env
NODE_ENV=production
PORT=10000
LITE_MODE=true
DATABASE_URL=<paste Neon URL>
REDIS_URL=<paste Upstash URL>
JWT_SECRET=<long random string, 32+ chars>
FRONTEND_URL=https://YOUR_VERCEL_APP.vercel.app
```

5. After first deploy, copy the backend URL, e.g. `https://tienlen-api.onrender.com`

> Free Render **sleeps** after ~15 min idle. First open can take 30–60s.  
> Optional: https://cron-job.org → ping `https://YOUR_BACKEND/api/health` every 10 minutes.

---

## 4. Vercel (frontend)

1. Open https://vercel.com → Sign up with GitHub  
2. **Import** repo `veasnag8/tien-len`  
3. Settings:

| Field | Value |
|-------|--------|
| Root Directory | `Frontend` |
| Framework | Next.js |
| Install Command | `cd .. && npm install` |
| Build Command | `cd .. && npm run build -w Shared && npm run build -w Socket && npm run build -w Frontend` |

4. Environment variables:

```env
NEXT_PUBLIC_LITE_MODE=true
NEXT_PUBLIC_API_URL=https://YOUR_BACKEND.onrender.com/api
NEXT_PUBLIC_WS_URL=https://YOUR_BACKEND.onrender.com
```

5. Deploy → open `https://YOUR_APP.vercel.app` on phone.

6. Go back to **Render** → set `FRONTEND_URL` to your Vercel URL → **Manual Deploy** again.

---

## 5. Play

1. Open Vercel link on phone  
2. Enter name → Create / Join room  
3. Share room code with friends  

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API errors / CORS | `FRONTEND_URL` on Render must match Vercel URL exactly |
| WebSocket fails | `NEXT_PUBLIC_WS_URL` = backend origin **without** `/api` |
| Blank / wrong API host | Redeploy Vercel after setting `NEXT_PUBLIC_*` |
| Cold start slow | Ping `/api/health` every 10 min (cron-job.org) |
| DB errors | Neon URL must include `?sslmode=require`; run migrate via start command |

---

## Local (PC on)

```cmd
npm.cmd run dev:tunnel
```

See also: `Docs/TUNNEL.md`, `Docs/DEPLOY.md` (VPS/Docker).
