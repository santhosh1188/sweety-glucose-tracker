const pool = require('../db/pool');
const AppError = require('../utils/AppError');
const { getReportRanges } = require('../utils/reportRanges');
const { todayString, isValidDateString } = require('../utils/dates');
const { SLOT_LABELS, SLOT_ORDER } = require('../validation/reading');

function resolveDate(query) {
  const date = query.date || todayString();
  if (!isValidDateString(date)) throw new AppError(400, 'Please enter a valid date.');
  if (date > todayString()) throw new AppError(400, 'Date cannot be in the future.');
  return date;
}

async function summarize(userId, { from, to }) {
  const { rows } = await pool.query(
    `SELECT MAX(value)::int AS highest,
            MIN(value)::int AS lowest,
            ROUND(AVG(value), 1)::float AS average,
            COUNT(*)::int AS count
     FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  return rows[0]; // with no readings: count 0 and the rest null, so the UI can show an empty state
}

const summaryHandler = (rangeKey) => async (req, res, next) => {
  try {
    const date = resolveDate(req.query);
    const range = getReportRanges(date)[rangeKey];
    res.json({ date, range, ...(await summarize(req.user.id, range)) });
  } catch (err) {
    next(err);
  }
};

exports.monthToDate = summaryHandler('monthToDate');
exports.monthly = summaryHandler('monthly');

exports.daily = async (req, res, next) => {
  try {
    const date = resolveDate(req.query);
    const range = getReportRanges(date).daily;
    const summary = await summarize(req.user.id, range);

    const { rows } = await pool.query(
      'SELECT id, slot, value FROM readings WHERE user_id = $1 AND reading_date = $2',
      [req.user.id, date]
    );
    const readings = rows
      .map((r) => ({ ...r, slotLabel: SLOT_LABELS[r.slot] }))
      .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));

    res.json({ date, range, ...summary, readings });
  } catch (err) {
    next(err);
  }
};
