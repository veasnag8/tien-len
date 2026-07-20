/**
 * Create the tienlen database only when missing (avoids noisy PG ERROR logs).
 */
async function ensureTienlenDatabase(pg, port = 54329) {
  let Client;
  try {
    ({ Client } = require('pg'));
  } catch {
    try {
      await pg.createDatabase('tienlen');
    } catch {
      // already exists
    }
    return;
  }

  const admin = new Client({
    host: '127.0.0.1',
    port,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });

  await admin.connect();
  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', ['tienlen']);
  if (rows.length === 0) {
    await pg.createDatabase('tienlen');
  }
  await admin.end();
}

module.exports = { ensureTienlenDatabase };
