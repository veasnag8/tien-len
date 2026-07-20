# Hosting guide — Tien Len

This app needs **PostgreSQL**, **Redis**, **NestJS (API + WebSockets)**, and **Next.js**. The easiest production setup is **one VPS + Docker Compose**.

---

## Option A — VPS + Docker (recommended)

Works on **DigitalOcean**, **Linode**, **Vultr**, **AWS EC2**, **Hetzner**, etc.

### What you need

| Item | Notes |
|------|--------|
| VPS | 2 GB RAM minimum (Ubuntu 22.04/24.04) |
| Domain | Optional but recommended (`tienlen.yourdomain.com`) |
| Ports | **80** (HTTP), **443** (HTTPS if using SSL) |

### 1. Create a server

Example: DigitalOcean Droplet → Ubuntu 24.04 → **2 GB RAM** → add your SSH key.

Note the server **public IP** (e.g. `203.0.113.10`).

### 2. Point DNS (if you have a domain)

| Type | Name | Value |
|------|------|--------|
| A | `@` or `play` | `203.0.113.10` |

Use `https://play.yourdomain.com` as your public URL below.

### 3. Install Docker on the server

SSH in, then:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in
```

### 4. Clone the project

```bash
git clone https://github.com/veasnag8/tien-len.git
cd tien-len
```

### 5. Configure environment

```bash
cp .env.example .env
nano .env
```

**Production example** (replace values):

```env
NODE_ENV=production
PUBLIC_URL=https://play.yourdomain.com
FRONTEND_URL=https://play.yourdomain.com

POSTGRES_USER=tienlen
POSTGRES_PASSWORD=use-a-long-random-password-here
POSTGRES_DB=tienlen

JWT_SECRET=use-another-long-random-string-at-least-32-chars

# OAuth (optional — guest + email still work without these)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://play.yourdomain.com/api/auth/google/callback
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_CALLBACK_URL=https://play.yourdomain.com/api/auth/facebook/callback
```

Generate secrets:

```bash
openssl rand -hex 32
```

### 6. Start the stack

**HTTP only (quick test with IP):**

```bash
PUBLIC_URL=http://YOUR_SERVER_IP docker compose up -d --build
```

**Production (hide DB ports, require secrets):**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

First start runs DB migrations automatically.

### 7. Verify

```bash
curl http://YOUR_SERVER_IP/api/health
# {"status":"ok",...}

docker compose logs -f backend
```

Open in browser: `http://YOUR_SERVER_IP` or `https://play.yourdomain.com`

### 8. HTTPS (Let's Encrypt)

See `nginx/nginx.ssl.conf.example` for SSL server block.

Quick path on Ubuntu:

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d play.yourdomain.com
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/play.yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/play.yourdomain.com/privkey.pem nginx/ssl/
```

Edit `nginx/nginx.conf` using the SSL example, then:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build nginx
```

Set `PUBLIC_URL=https://play.yourdomain.com` in `.env` and rebuild frontend:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend
```

### 9. Updates after code changes

```bash
cd tien-len
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Option B — Split hosting (advanced)

| Service | Platform | Notes |
|---------|----------|--------|
| Frontend | Vercel | Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` to backend URL |
| Backend + WS | Render / Railway / Fly.io | Must support **WebSockets** |
| PostgreSQL | Neon / Supabase / Render | Set `DATABASE_URL` |
| Redis | Upstash / Render | Set `REDIS_URL` |

WebSocket games need the **same public origin** for API and WS, or correct CORS + cookie settings. VPS + Nginx is simpler.

---

## Environment variables reference

| Variable | Purpose |
|----------|---------|
| `PUBLIC_URL` | Public site URL (used for Next.js build + invite links) |
| `FRONTEND_URL` | CORS origin for backend (usually same as `PUBLIC_URL`) |
| `JWT_SECRET` | Auth token signing (required in production) |
| `POSTGRES_PASSWORD` | Database password (required in prod compose) |
| `DATABASE_URL` | Auto-set in Docker; set manually if split hosting |
| `REDIS_URL` | Auto-set in Docker; set manually if split hosting |
| `NEXT_PUBLIC_API_URL` | Frontend → API (`{PUBLIC_URL}/api`) |
| `NEXT_PUBLIC_WS_URL` | Frontend → Socket.IO (`PUBLIC_URL` without `/api`) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page / API errors | Rebuild frontend with correct `PUBLIC_URL` |
| WebSocket fails | Ensure Nginx proxies `/socket.io/` and firewall allows 80/443 |
| "Syncing game…" forever | Restart stack; Redis must be running |
| OAuth errors | Leave Google/Facebook empty or set full callback URLs |
| Port 80 in use | Stop IIS/other web servers on the host |

---

## Health checks

- `GET /api/health` — API alive
- `docker compose ps` — all services `healthy` / `running`
