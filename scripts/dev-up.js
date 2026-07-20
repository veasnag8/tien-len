/**
 * Zero-Docker local bootstrap:
 * - embedded PostgreSQL
 * - in-memory Redis server
 * - Prisma migrate
 * - NestJS backend + Next.js frontend
 *
 * Hotspot mode (--hotspot): bind to LAN IP so friends on phone Wi‑Fi can join.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { ensureTienlenDatabase } = require('./db-utils');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const pgDir = path.join(dataDir, 'postgres');

function detectLanIp() {
  if (process.env.LAN_HOST) {
    return process.env.LAN_HOST;
  }
  const candidates = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces || []) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }
  const hotspot = candidates.find(
    (ip) =>
      ip.startsWith('192.168.43.') ||
      ip.startsWith('192.168.137.') ||
      ip.startsWith('192.168.0.') ||
      ip.startsWith('10.'),
  );
  return hotspot || candidates[0] || 'localhost';
}

async function main() {
  const hotspotMode =
    process.env.HOTSPOT === '1' ||
    process.argv.includes('--hotspot') ||
    process.argv.includes('--lan');

  const lanIp = hotspotMode ? detectLanIp() : 'localhost';
  const appUrl = `http://${lanIp}:3000`;
  const apiUrl = `http://${lanIp}:4000/api`;
  const wsUrl = `http://${lanIp}:4000`;
  const frontendUrl = hotspotMode
    ? `${appUrl},http://localhost:3000`
    : 'http://localhost:3000';

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
    FRONTEND_URL: frontendUrl,
    PORT: '4000',
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_WS_URL: wsUrl,
    LITE_MODE: 'true',
    NEXT_PUBLIC_LITE_MODE: 'true',
    NODE_ENV: 'development',
  };

  const backendEnv = path.join(root, 'Backend', '.env');
  const envText = [
    'NODE_ENV=development',
    'PORT=4000',
    `FRONTEND_URL=${frontendUrl}`,
    `DATABASE_URL=${databaseUrl}`,
    `REDIS_URL=${redisUrl}`,
    'JWT_SECRET=local-dev-secret-change-me',
    'REFRESH_TOKEN_DAYS=30',
    'GOOGLE_CLIENT_ID=',
    'GOOGLE_CLIENT_SECRET=',
    `GOOGLE_CALLBACK_URL=http://${lanIp}:4000/api/auth/google/callback`,
    'FACEBOOK_APP_ID=',
    'FACEBOOK_APP_SECRET=',
    `FACEBOOK_CALLBACK_URL=http://${lanIp}:4000/api/auth/facebook/callback`,
    `NEXT_PUBLIC_API_URL=${apiUrl}`,
    `NEXT_PUBLIC_WS_URL=${wsUrl}`,
    'LITE_MODE=true',
    'NEXT_PUBLIC_LITE_MODE=true',
    '',
  ].join('\n');
  fs.writeFileSync(backendEnv, envText);
  fs.writeFileSync(path.join(root, '.env'), envText);

  console.log('Generating Prisma client + migrating...');
  await run('npx', ['prisma', 'generate', '--schema=../Database/schema.prisma'], path.join(root, 'Backend'), env);
  await run('npx', ['prisma', 'db', 'push', '--schema=../Database/schema.prisma', '--accept-data-loss'], path.join(root, 'Backend'), env);

  console.log('Starting backend on :4000 ...');
  const backend = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['nest', 'start', '--watch'],
    { cwd: path.join(root, 'Backend'), env, stdio: 'inherit', shell: true },
  );

  const nextArgs = ['next', 'dev', '-p', '3000'];
  if (hotspotMode) {
    nextArgs.push('-H', '0.0.0.0');
  }

  console.log('Starting frontend on :3000 ...');
  const frontend = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    nextArgs,
    { cwd: path.join(root, 'Frontend'), env, stdio: 'inherit', shell: true },
  );

  const shutdown = async () => {
    backend.kill();
    frontend.kill();
    await redisServer.stop();
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('\n========================================');
  if (hotspotMode) {
    console.log('  HOTSPOT MODE — friends join via your phone Wi‑Fi');
    console.log(`  Share this link:  ${appUrl}`);
    console.log(`  Your LAN IP:      ${lanIp}`);
    console.log('  (Uses little SIM data — traffic stays on local Wi‑Fi)');
  } else {
    console.log('  App:  http://localhost:3000');
  }
  console.log(`  API:  http://${lanIp}:4000/api/health`);
  console.log('========================================\n');
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
