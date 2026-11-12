const pool = require('../db/pool');
const AppError = require('../utils/AppError');
const { validateReadingInput, duplicateSlotMessage, MAX_READINGS_PER_DAY } = require('../validation/reading');

const COLUMNS = 'id, reading_date AS date, slot, value';

// Throws if the slot is taken or the day is full. excludeId lets an edit ignore itself.
async function assertSlotAvailable(userId, date, slot, excludeId = 0) {
  const { rows } = await pool.query(
    'SELECT slot FROM readings WHERE user_id = $1 AND reading_date = $2 AND id <> $3',
    [userId, date, excludeId]
  );
  if (rows.some((r) => r.slot === slot)) throw new AppError(409, duplicateSlotMessage(slot));
  if (rows.length >= MAX_READINGS_PER_DAY) throw new AppError(409, 'You can add only 4 readings per day.');
}

exports.create = async (req, res, next) => {
  try {
    const { date, slot, value } = validateReadingInput(req.body);
    await assertSlotAvailable(req.user.id, date, slot);
    const { rows } = await pool.query(
      `INSERT INTO readings (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [req.user.id, date, slot, value]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // Two simultaneous requests can both pass the check; the DB constraint catches the loser
    if (err.code === '23505') return next(new AppError(409, duplicateSlotMessage(req.body.slot)));
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM readings WHERE user_id = $1
       ORDER BY reading_date DESC, id DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { date, slot, value } = validateReadingInput(req.body);
    await assertSlotAvailable(req.user.id, date, slot, id);
    const { rows } = await pool.query(
      `UPDATE readings SET reading_date = $1, slot = $2, value = $3, updated_at = now()
       WHERE id = $4 AND user_id = $5 RETURNING ${COLUMNS}`,
      [date, slot, value, id, req.user.id]
    );
    if (!rows[0]) throw new AppError(404, 'Reading not found.');
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return next(new AppError(409, duplicateSlotMessage(req.body.slot)));
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM readings WHERE id = $1 AND user_id = $2',
      [Number(req.params.id), req.user.id]
    );
    if (!rowCount) throw new AppError(404, 'Reading not found.');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};