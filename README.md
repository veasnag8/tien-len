# Tiến Lên Miền Nam — Online Multiplayer

Production-quality realtime multiplayer Tiến Lên Miền Nam (Southern Vietnamese card game).

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

## Quick start (local)

1. Copy env file:

```bash
cp .env.example .env
```

2. Start Postgres + Redis:

```bash
docker compose up -d postgres redis
```

3. Install & build shared packages:

```bash
npm install
npm run build -w Shared
npm run build -w Socket
```

4. Migrate database:

```bash
cd Backend
npx prisma migrate deploy --schema=../Database/schema.prisma
npx prisma generate --schema=../Database/schema.prisma
cd ..
```

5. Run apps:

```bash
npm run dev:backend
npm run dev:frontend
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/health

## Full Docker deploy

```bash
cp .env.example .env
# set JWT_SECRET and OAuth keys in .env
docker compose up -d --build
```

App: http://localhost

## Demo account (after seed)

```bash
npm run db:seed
```

- Email: `demo@tienlen.app`
- Password: `Password123!`

## Security model

- Server-authoritative game engine in `Shared`
- Every play/pass validated on the server
- Duplicate request IDs blocked via Redis locks
- Hands never sent to other clients
- Reconnect restores private hand from Redis game state
