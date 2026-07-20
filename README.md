# ទៀនលើន · Tien Len — Online Multiplayer

Production-quality realtime multiplayer Tien Len (Khmer & English UI).

## Stack

- **Frontend:** Next.js 15, React 19, TypeScript, TailwindCSS, Framer Motion, React Query
- **Backend:** NestJS, Socket.IO, Prisma, Redis, PostgreSQL
- **Auth:** Email, Google, Facebook, Guest
- **Deploy:** Docker Compose + Nginx

## Project layout

```
Frontend/   Next.js app
Backend/    NestJS API + Socket.IO gateway
Shared/     Cards, rules engine, DTOs
Socket/     Shared Socket.IO event contracts
Database/   Prisma schema + migrations
Assets/     Static game assets
Docs/       Architecture & ops docs
nginx/      Reverse proxy config
```

## Quick start (no Docker)

```bash
npm install
npm run build -w Shared
npm run build -w Socket
npm run dev:local
```

App: http://localhost:3000

## Quick start (Docker)

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET and PUBLIC_URL for production
docker compose up -d --build
```

## Deploy

| Mode | Guide |
|------|--------|
| **Free (phone only, no PC)** | [Docs/FREE_HOSTING.md](Docs/FREE_HOSTING.md) — Vercel + Render + Neon + Upstash |
| **VPS / Docker** | [Docs/DEPLOY.md](Docs/DEPLOY.md) |
| **PC on + tunnel** | [Docs/TUNNEL.md](Docs/TUNNEL.md) — `npm run dev:tunnel` |

```bash
npm run docker:prod
```

## Security model

- Server-authoritative game engine in `Shared`
- Every play/pass validated on the server
- Duplicate request IDs blocked via Redis locks
- Hands never sent to other clients
- Reconnect restores private hand from Redis game state
