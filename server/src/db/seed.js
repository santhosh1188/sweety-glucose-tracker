const bcrypt = require('bcrypt');
const pool = require('./pool');
const { todayString } = require('../utils/dates');
const { SLOT_ORDER } = require('../validation/reading');

const DEMO = { name: 'Demo Patient', email: 'demo@sweety.app', password: 'password123' };
const BASE = { morning_fasting: 105, after_breakfast: 150, after_lunch: 145, after_dinner: 140 };
const DAYS = 45; // covers the whole previous month plus the current one

function daysAgo(n) {
  const d = new Date(`${todayString()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

(async () => {
  // Re-runnable: remove the demo user (readings cascade), then recreate
  await pool.query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [DEMO.email]);
  const hash = await bcrypt.hash(DEMO.password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [DEMO.name, DEMO.email, hash]
  );

  let count = 0;
  for (let i = 0; i < DAYS; i++) {
    for (const [idx, slot] of SLOT_ORDER.entries()) {
      if ((i + idx) % 7 === 0) continue; // leave some gaps, like a real patient
      const value = Math.min(600, Math.max(40, BASE[slot] + ((i * 37 + idx * 11) % 61) - 30));
      await pool.query(
        'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)',
        [rows[0].id, daysAgo(i), slot, value]
      );
      count++;
    }
  }
  console.log(`Seeded ${count} readings for ${DEMO.email} (password: ${DEMO.password})`);
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });