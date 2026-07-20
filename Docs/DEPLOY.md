# Deployment

## Prerequisites

- Docker + Docker Compose
- Domain DNS pointed at your server (optional)
- Google / Facebook OAuth app credentials (optional; email + guest work without them)

## Steps

1. Copy `.env.example` → `.env` and set a strong `JWT_SECRET`
2. Set `FRONTEND_URL` to your public URL
3. Fill OAuth keys if using Google/Facebook login
4. Run:

```bash
docker compose up -d --build
```

5. Open `http://your-server` (Nginx on port 80)

## Health checks

- API: `GET /api/health`
- Postgres / Redis: compose healthchecks

## Scaling notes

- Game state is Redis-backed — run a single Socket.IO sticky session per room or enable Redis adapter for multi-instance gateways
- Postgres stores users, rooms metadata, and rankings
