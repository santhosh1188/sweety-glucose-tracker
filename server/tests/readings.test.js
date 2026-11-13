const request = require('supertest');
const app = require('../src/app');
const { migrate, resetDb, registerUser, addReading, authGet, pool } = require('./helpers');

beforeAll(migrate);
beforeEach(resetDb);
afterAll(() => pool.end());

const DATE = '2026-11-10';
const valid = { date: DATE, slot: 'after_lunch', value: 140 };

describe('creating readings', () => {
  test('creates a valid reading', async () => {
    const { token } = await registerUser();
    const res = await addReading(token, valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ date: DATE, slot: 'after_lunch', value: 140 });
  });

  test.each([
    ['missing value', { date: DATE, slot: 'morning_fasting' }, 'Please enter a glucose value.'],
    ['value 39', { date: DATE, slot: 'morning_fasting', value: 39 }, 'Value must be between 40 and 600 mg/dl.'],
    ['value 601', { date: DATE, slot: 'morning_fasting', value: 601 }, 'Value must be between 40 and 600 mg/dl.'],
    ['decimal 120.5', { date: DATE, slot: 'morning_fasting', value: 120.5 }, 'Value must be between 40 and 600 mg/dl.'],
    ['text value', { date: DATE, slot: 'morning_fasting', value: 'abc' }, 'Value must be between 40 and 600 mg/dl.'],
    ['future date', { date: '2999-01-01', slot: 'morning_fasting', value: 100 }, 'Date cannot be in the future.'],
    ['invalid date', { date: '2026-13-45', slot: 'morning_fasting', value: 100 }, 'Please enter a valid date.'],
    ['invalid slot', { date: DATE, slot: 'bad_slot', value: 100 }, 'Please choose a valid time slot.'],
  ])('rejects %s', async (_label, body, message) => {
    const { token } = await registerUser();
    const res = await addReading(token, body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  test.each([[40], [600]])('accepts the boundary value %i', async (value) => {
    const { token } = await registerUser();
    const res = await addReading(token, { ...valid, value });
    expect(res.status).toBe(201);
  });

  test('rejects a second reading for the same slot and date', async () => {
    const { token } = await registerUser();
    await addReading(token, valid);
    const res = await addReading(token, { ...valid, value: 150 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('You already have an After lunch reading for this date.');
  });

  test('allows the same slot on a different day, and for a different user', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await addReading(a.token, valid);
    expect((await addReading(a.token, { ...valid, date: '2026-11-09' })).status).toBe(201);
    expect((await addReading(b.token, valid)).status).toBe(201);
  });

  test('allows all 4 slots in a day, and nothing beyond that', async () => {
    const { token } = await registerUser();
    for (const slot of ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      expect((await addReading(token, { date: DATE, slot, value: 120 })).status).toBe(201);
    }
    // Every slot is taken, so any further reading is rejected
    const res = await addReading(token, { date: DATE, slot: 'after_dinner', value: 130 });
    expect(res.status).toBe(409);
  });

  test('requires a token', async () => {
    const res = await request(app).post('/api/readings').send(valid);
    expect(res.status).toBe(401);
  });

  test('rejects an invalid token', async () => {
    const res = await addReading('not-a-real-token', valid);
    expect(res.status).toBe(401);
  });
});

describe('listing readings', () => {
  test('returns only my readings, newest date first', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await addReading(a.token, { ...valid, date: '2026-11-08' });
    await addReading(a.token, { ...valid, date: '2026-11-10' });
    await addReading(b.token, valid);

    const res = await authGet(a.token, '/api/readings');
    expect(res.status).toBe(200);
    expect(res.body.data.map((r) => r.date)).toEqual(['2026-11-10', '2026-11-08']);
    expect(res.body.total).toBe(2);
  });

  test('paginates with page and limit', async () => {
    const { token } = await registerUser();
    for (const d of ['2026-11-05', '2026-11-06', '2026-11-07']) {
      await addReading(token, { ...valid, date: d });
    }
    const page2 = await authGet(token, '/api/readings?page=2&limit=2');
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });
});

describe('editing readings', () => {
  test('edits my own reading without tripping the duplicate check', async () => {
    const { token } = await registerUser();
    const { body } = await addReading(token, valid);
    const res = await request(app)
      .put(`/api/readings/${body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...valid, value: 155 });
    expect(res.status).toBe(200);
    expect(res.body.value).toBe(155);
  });

  test('rejects moving a reading into a slot that is already taken', async () => {
    const { token } = await registerUser();
    await addReading(token, { ...valid, slot: 'morning_fasting' });
    const { body } = await addReading(token, valid);
    const res = await request(app)
      .put(`/api/readings/${body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...valid, slot: 'morning_fasting' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('You already have a Morning (fasting) reading for this date.');
  });

  test('validates values on edit', async () => {
    const { token } = await registerUser();
    const { body } = await addReading(token, valid);
    const res = await request(app)
      .put(`/api/readings/${body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...valid, value: 700 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Value must be between 40 and 600 mg/dl.');
  });

  test('returns 404 for a reading that does not exist', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .put('/api/readings/999999')
      .set('Authorization', `Bearer ${token}`)
      .send(valid);
    expect(res.status).toBe(404);
  });
});

describe('deleting readings', () => {
  test('deletes my reading', async () => {
    const { token } = await registerUser();
    const { body } = await addReading(token, valid);
    const del = await request(app).delete(`/api/readings/${body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
    expect((await authGet(token, '/api/readings')).body.data).toHaveLength(0);
  });

  test('returns 404 for a reading that does not exist', async () => {
    const { token } = await registerUser();
    const res = await request(app).delete('/api/readings/999999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('ownership', () => {
  test("user B cannot edit or delete user A's reading", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const { body } = await addReading(a.token, valid);

    const edit = await request(app)
      .put(`/api/readings/${body.id}`)
      .set('Authorization', `Bearer ${b.token}`)
      .send({ ...valid, value: 99 });
    const del = await request(app).delete(`/api/readings/${body.id}`).set('Authorization', `Bearer ${b.token}`);
    expect(edit.status).toBe(404);
    expect(del.status).toBe(404);

    // A's reading is untouched
    const list = await authGet(a.token, '/api/readings');
    expect(list.body.data[0].value).toBe(140);
  });

  test("user B's list does not include A's readings", async () => {
    const a = await registerUser();
    const b = await registerUser();
    await addReading(a.token, valid);
    expect((await authGet(b.token, '/api/readings')).body.data).toHaveLength(0);
  });
});