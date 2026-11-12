const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const AppError = require('../utils/AppError');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const signToken = (userId) => jwt.sign({ sub: userId }, jwtSecret, { expiresIn: jwtExpiresIn });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim()) throw new AppError(400, 'Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email || '')) throw new AppError(400, 'Please enter a valid email.');
    if (!password || password.length < 8) throw new AppError(400, 'Password must be at least 8 characters.');

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, name, email`,
      [name.trim(), email.trim(), passwordHash]
    );
    res.status(201).json({ token: signToken(rows[0].id), user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return next(new AppError(409, 'An account with this email already exists.'));
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)',
      [email || '']
    );
    const user = rows[0];
    // Same message for unknown email and wrong password, so we don't reveal which accounts exist
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      throw new AppError(401, 'Invalid email or password.');
    }
    const { password_hash, ...safeUser } = user;
    res.json({ token: signToken(user.id), user: safeUser });
  } catch (err) {
    next(err);
  }
};