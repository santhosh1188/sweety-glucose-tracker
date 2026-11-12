const { appTimezone } = require('../config/env');

// 'YYYY-MM-DD' for today in the configured time zone
exports.todayString = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: appTimezone }).format(new Date());

exports.isValidDateString = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};