const pad = (n) => String(n).padStart(2, '0');
const fmt = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
// m is 1-12; day 0 of the next month is the last day of this one
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Given a selected date 'YYYY-MM-DD', returns the three report ranges.
 * monthly = the whole calendar month before the selected date's month.
 */
function getReportRanges(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;

  return {
    daily: { from: dateStr, to: dateStr },
    monthToDate: { from: fmt(y, m, 1), to: dateStr },
    monthly: { from: fmt(prevY, prevM, 1), to: fmt(prevY, prevM, daysInMonth(prevY, prevM)) },
  };
}

module.exports = { getReportRanges };