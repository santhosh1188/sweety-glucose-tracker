const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');

// Safety net: never wipe a database that isn't clearly a test database
function assertTestDb() {
  if (!/test/i.test(process.env.DATABASE_URL || '')) {
    throw new Error('Refusing to run tests: DATABASE_URL must point to a *test* database (check server/.env.test).');
  }
}

async function migrate() {
  assertTestDb();
  const dir = path.join(__dirname, '../src/db/migrations');
  for (const file of fs.readdirSync(dir).sort()) {
    await pool.query(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
}

async function resetDb() {
  assertTestDb();
  await pool.query('TRUNCATE readings, users RESTART IDENTITY CASCADE');
}

async function registerUser(overrides = {}) {
  const email = overrides.email || `user${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'password123', ...overrides });
  return { token: res.body.token, user: res.body.user, email };
}

const addReading = (token, body) =>
  request(app).post('/api/readings').set('Authorization', `Bearer ${token}`).send(body);

const authGet = (token, url) => request(app).get(url).set('Authorization', `Bearer ${token}`);

module.exports = { migrate, resetDb, registerUser, addReading, authGet, pool };