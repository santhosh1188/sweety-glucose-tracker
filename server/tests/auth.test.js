const request = require('supertest');
const app = require('../src/app');
const { migrate, resetDb, registerUser, pool } = require('./helpers');

beforeAll(migrate);
beforeEach(resetDb);
afterAll(() => pool.end());

describe('POST /api/auth/register', () => {
  test('creates a user and returns a token without the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'asha@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Asha', email: 'asha@test.com' });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('stores a bcrypt hash, never the plain password', async () => {
    await registerUser({ email: 'hash@test.com', password: 'password123' });
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', ['hash@test.com']);
    expect(rows[0].password_hash).not.toBe('password123');
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  test('rejects a duplicate email, ignoring case', async () => {
    await registerUser({ email: 'dup@test.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'DUP@test.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('An account with this email already exists.');
  });

  test.each([
    ['missing name', { email: 'a@test.com', password: 'password123' }, 'Please enter your name.'],
    ['invalid email', { name: 'A', email: 'not-an-email', password: 'password123' }, 'Please enter a valid email.'],
    ['short password', { name: 'A', email: 'a@test.com', password: '123' }, 'Password must be at least 8 characters.'],
  ])('rejects %s', async (_label, body, message) => {
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser({ email: 'login@test.com', password: 'password123' });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('email is case-insensitive', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'LOGIN@test.com', password: 'password123' });
    expect(res.status).toBe(200);
  });

  test('wrong password and unknown email give the same message', async () => {
    const wrongPass = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'wrongpass1' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'password123' });
    expect(wrongPass.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPass.body.error).toBe('Invalid email or password.');
    expect(unknown.body.error).toBe('Invalid email or password.');
  });
});