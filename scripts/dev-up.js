/**
 * Zero-Docker local bootstrap:
 * - embedded PostgreSQL
 * - in-memory Redis server
 * - Prisma migrate
 * - NestJS backend + Next.js frontend
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const pgDir = path.join(dataDir, 'postgres');

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

  try {
    await pg.createDatabase('tienlen');
  } catch {
    // already exists
  }

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
    FRONTEND_URL: 'http://localhost:3000',
    PORT: '4000',
    NEXT_PUBLIC_API_URL: 'http://localhost:4000/api',
    NEXT_PUBLIC_WS_URL: 'http://localhost:4000',
    NODE_ENV: 'development',
  };

  // Persist for Backend Prisma CLI
  const backendEnv = path.join(root, 'Backend', '.env');
  const envText = [
    'NODE_ENV=development',
    'PORT=4000',
    'FRONTEND_URL=http://localhost:3000',
    `DATABASE_URL=${databaseUrl}`,
    `REDIS_URL=${redisUrl}`,
    'JWT_SECRET=local-dev-secret-change-me',
    'REFRESH_TOKEN_DAYS=30',
    'GOOGLE_CLIENT_ID=',
    'GOOGLE_CLIENT_SECRET=',
    'GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback',
    'FACEBOOK_APP_ID=',
    'FACEBOOK_APP_SECRET=',
    'FACEBOOK_CALLBACK_URL=http://localhost:4000/api/auth/facebook/callback',
    'NEXT_PUBLIC_API_URL=http://localhost:4000/api',
    'NEXT_PUBLIC_WS_URL=http://localhost:4000',
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

  console.log('Starting frontend on :3000 ...');
  const frontend = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'dev', '-p', '3000'],
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
  console.log('  App:  http://localhost:3000');
  console.log('  API:  http://localhost:4000/api/health');
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
