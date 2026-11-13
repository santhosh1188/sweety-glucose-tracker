const request = require('supertest');
const app = require('../src/app');
const { migrate, resetDb, registerUser, addReading, authGet, pool } = require('./helpers');

beforeAll(migrate);
afterAll(() => pool.end());

let token;

// Base data: Nov 9 -> 40, 600 | Nov 10 -> 155 | Oct 20 -> 100
beforeEach(async () => {
  await resetDb();
  ({ token } = await registerUser());
  await addReading(token, { date: '2026-11-09', slot: 'morning_fasting', value: 40 });
  await addReading(token, { date: '2026-11-09', slot: 'after_dinner', value: 600 });
  await addReading(token, { date: '2026-11-10', slot: 'after_lunch', value: 155 });
  await addReading(token, { date: '2026-10-20', slot: 'morning_fasting', value: 100 });
});

describe('GET /api/reports/daily', () => {
  test('summarises the selected day and lists its readings', async () => {
    const res = await authGet(token, '/api/reports/daily?date=2026-11-10');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      range: { from: '2026-11-10', to: '2026-11-10' },
      count: 1, highest: 155, lowest: 155, average: 155,
    });
    expect(res.body.readings).toEqual([expect.objectContaining({ slot: 'after_lunch', slotLabel: 'After lunch', value: 155 })]);
  });

  test('lists readings in slot order, not insertion order', async () => {
    await addReading(token, { date: '2026-11-12', slot: 'after_dinner', value: 130 });
    await addReading(token, { date: '2026-11-12', slot: 'morning_fasting', value: 90 });
    const res = await authGet(token, '/api/reports/daily?date=2026-11-12');
    expect(res.body.readings.map((r) => r.slot)).toEqual(['morning_fasting', 'after_dinner']);
  });

  test('rounds the average to 1 decimal', async () => {
    await addReading(token, { date: '2026-08-05', slot: 'morning_fasting', value: 100 });
    await addReading(token, { date: '2026-08-05', slot: 'after_breakfast', value: 101 });
    await addReading(token, { date: '2026-08-05', slot: 'after_lunch', value: 101 });
    const res = await authGet(token, '/api/reports/daily?date=2026-08-05');
    expect(res.body.average).toBe(100.7); // 302 / 3 = 100.666...
  });

  test('empty day returns count 0 and null stats', async () => {
    const res = await authGet(token, '/api/reports/daily?date=2026-11-11');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ count: 0, highest: null, lowest: null, average: null, readings: [] });
  });

  test('defaults to today when no date is given', async () => {
    const res = await authGet(token, '/api/reports/daily');
    expect(res.status).toBe(200);
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('GET /api/reports/month-to-date', () => {
  test('covers the 1st through the selected date', async () => {
    const res = await authGet(token, '/api/reports/month-to-date?date=2026-11-10');
    expect(res.body).toMatchObject({
      range: { from: '2026-11-01', to: '2026-11-10' },
      count: 3, highest: 600, lowest: 40, average: 265,
    });
  });

  test('ignores readings after the selected date', async () => {
    await addReading(token, { date: '2026-11-12', slot: 'morning_fasting', value: 300 });
    const res = await authGet(token, '/api/reports/month-to-date?date=2026-11-10');
    expect(res.body.count).toBe(3);
  });
});

describe('GET /api/reports/monthly', () => {
  test('covers the whole previous month', async () => {
    const res = await authGet(token, '/api/reports/monthly?date=2026-11-10');
    expect(res.body).toMatchObject({
      range: { from: '2026-10-01', to: '2026-10-31' },
      count: 1, highest: 100, lowest: 100, average: 100,
    });
  });

  test('includes the first and last day, excludes neighbouring months', async () => {
    await addReading(token, { date: '2026-10-01', slot: 'morning_fasting', value: 80 });
    await addReading(token, { date: '2026-10-31', slot: 'morning_fasting', value: 120 });
    await addReading(token, { date: '2026-09-30', slot: 'morning_fasting', value: 300 });
    await addReading(token, { date: '2026-11-01', slot: 'morning_fasting', value: 400 });
    const res = await authGet(token, '/api/reports/monthly?date=2026-11-10');
    expect(res.body).toMatchObject({ count: 3, highest: 120, lowest: 80, average: 100 });
  });

  test('empty previous month returns the empty state', async () => {
    const res = await authGet(token, '/api/reports/monthly?date=2026-03-10');
    expect(res.body).toMatchObject({
      range: { from: '2026-02-01', to: '2026-02-28' },
      count: 0, highest: null, lowest: null, average: null,
    });
  });
});

describe('report access and validation', () => {
  test('rejects a future date', async () => {
    const res = await authGet(token, '/api/reports/daily?date=2999-01-01');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Date cannot be in the future.');
  });

  test('rejects an invalid date', async () => {
    const res = await authGet(token, '/api/reports/daily?date=2026-13-45');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please enter a valid date.');
  });

  test('requires a token', async () => {
    const res = await request(app).get('/api/reports/daily?date=2026-11-10');
    expect(res.status).toBe(401);
  });

  test("a user's reports only include their own readings", async () => {
    const other = await registerUser();
    const res = await authGet(other.token, '/api/reports/month-to-date?date=2026-11-10');
    expect(res.body.count).toBe(0);
  });
});