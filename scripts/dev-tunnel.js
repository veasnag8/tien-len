/**
 * Internet play via Cloudflare Tunnel (free, no hotspot).
 * Friends open the public link on phone from anywhere (mobile data / Wi‑Fi).
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ensureTienlenDatabase } = require('./db-utils');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const pgDir = path.join(dataDir, 'postgres');

const children = [];

function track(child) {
  children.push(child);
  return child;
}

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });

  console.log('Starting embedded PostgreSQL...');
  const EmbeddedPostgres = require('embedded-postgres').default;
  const pg = new EmbeddedPostgres({
    databaseDir: pgDir,
    user: 'postgres',
    password: 'postgres',
    port: 54329,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });

  if (!fs.existsSync(path.join(pgDir, 'PG_VERSION'))) {
    await pg.initialise();
  }
  await pg.start();

  await ensureTienlenDatabase(pg);

  console.log('Starting Redis Memory Server...');
  const { RedisMemoryServer } = require('redis-memory-server');
  const redisServer = await RedisMemoryServer.create();
  const redisHost = await redisServer.getHost();
  const redisPort = await redisServer.getPort();

  const databaseUrl = 'postgresql://postgres:postgres@127.0.0.1:54329/tienlen?schema=public';
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret-change-me',
    FRONTEND_URL: '*',
    PORT: '4000',
    NEXT_PUBLIC_API_URL: '/api',
    NEXT_PUBLIC_WS_URL: 'http://localhost:4000',
    NEXT_PUBLIC_RELATIVE_URLS: 'true',
    RELATIVE_INVITE_URLS: 'true',
    LITE_MODE: 'true',
    NEXT_PUBLIC_LITE_MODE: 'true',
    NODE_ENV: 'development',
  };

  const envText = [
    'NODE_ENV=development',
    'PORT=4000',
    'FRONTEND_URL=*',
    `DATABASE_URL=${databaseUrl}`,
    `REDIS_URL=${redisUrl}`,
    'JWT_SECRET=local-dev-secret-change-me',
    'LITE_MODE=true',
    'NEXT_PUBLIC_LITE_MODE=true',
    'NEXT_PUBLIC_RELATIVE_URLS=true',
    'RELATIVE_INVITE_URLS=true',
    'NEXT_PUBLIC_API_URL=/api',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, 'Backend', '.env'), envText);
  fs.writeFileSync(path.join(root, '.env'), envText);

  console.log('Generating Prisma client + migrating...');
  await run('npx', ['prisma', 'generate', '--schema=../Database/schema.prisma'], path.join(root, 'Backend'), env);
  await run('npx', ['prisma', 'db', 'push', '--schema=../Database/schema.prisma', '--accept-data-loss'], path.join(root, 'Backend'), env);

  console.log('Starting backend on :4000 ...');
  track(
    spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['nest', 'start', '--watch'], {
      cwd: path.join(root, 'Backend'),
      env,
      stdio: 'inherit',
      shell: true,
    }),
  );

  console.log('Starting frontend on :3000 ...');
  track(
    spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev', '-p', '3000'], {
      cwd: path.join(root, 'Frontend'),
      env,
      stdio: 'inherit',
      shell: true,
    }),
  );

  console.log('Starting local proxy on :8080 ...');
  track(
    spawn(process.execPath, [path.join(__dirname, 'tunnel-proxy.js')], {
      cwd: root,
      env,
      stdio: 'inherit',
    }),
  );

  console.log('Waiting for services to warm up...');
  await sleep(12_000);

  console.log('Starting Cloudflare Tunnel (free)...');
  const tunnelUrl = await startCloudflared();
  if (!tunnelUrl) {
    console.error('Could not get tunnel URL. Install cloudflared or check network.');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('  INTERNET MODE — no hotspot needed');
  console.log(`  Share this link:  ${tunnelUrl}`);
  console.log('  Friends: open on phone (SIM / Wi‑Fi)');
  console.log('  Enter name → Create or Join room');
  console.log('  Keep this PC on while playing');
  console.log('========================================\n');
}

function startCloudflared() {
  return new Promise((resolve) => {
    let resolved = false;
    const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const args = ['cloudflared', 'tunnel', '--url', 'http://127.0.0.1:8080'];
    const proc = track(
      spawn(bin, args, {
        cwd: root,
        env: process.env,
        shell: true,
      }),
    );

    const onData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !resolved) {
        resolved = true;
        resolve(match[0]);
      }
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);

    proc.on('exit', () => {
      if (!resolved) {
        resolve(null);
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 90_000);
  });
}

function run(cmd, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env, stdio: 'inherit', shell: true });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shutdown() {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // ignore
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
