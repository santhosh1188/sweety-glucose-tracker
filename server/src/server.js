const app = require('./app');
const pool = require('./db/pool');
const { port } = require('./config/env');

async function start() {
  try {
    const { rows } = await pool.query('SELECT current_database() AS db');
    console.log(`[DB] Connected to database "${rows[0].db}"`);
  } catch (err) {
    console.error('[DB] Connection FAILED:', err.message);
    console.error('[DB] Check that PostgreSQL is running and DATABASE_URL in server/.env is correct.');
    process.exit(1);
  }

  app.listen(port, () => console.log(`[API] Running on http://localhost:${port}`));
}

start();