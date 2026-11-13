const { getReportRanges } = require('../src/utils/reportRanges');

describe('getReportRanges', () => {
  test('matches the assignment example (15 Oct 2026)', () => {
    expect(getReportRanges('2026-10-15')).toEqual({
      daily: { from: '2026-10-15', to: '2026-10-15' },
      monthToDate: { from: '2026-10-01', to: '2026-10-15' },
      monthly: { from: '2026-09-01', to: '2026-09-30' },
    });
  });

  test('January rolls back to December of the previous year', () => {
    expect(getReportRanges('2026-01-10').monthly).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  test('March after a leap year February uses 29 days', () => {
    expect(getReportRanges('2024-03-05').monthly).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  test('March in a normal year uses 28 days', () => {
    expect(getReportRanges('2026-03-05').monthly).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  test('on the 1st, month-to-date is a single day', () => {
    expect(getReportRanges('2026-11-01').monthToDate).toEqual({ from: '2026-11-01', to: '2026-11-01' });
  });

  test('31-day previous month', () => {
    expect(getReportRanges('2026-11-12').monthly).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });
});