export const SLOTS = [
  { value: 'morning_fasting', label: 'Morning (fasting)' },
  { value: 'after_breakfast', label: 'After breakfast' },
  { value: 'after_lunch', label: 'After lunch' },
  { value: 'after_dinner', label: 'After dinner' },
];
export const slotLabel = (value) => SLOTS.find((s) => s.value === value)?.label || value;

// 'YYYY-MM-DD' in the user's local time zone
export const todayLocal = () => new Date().toLocaleDateString('en-CA');

const fmtDay = (s, withYear) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC', day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }),
  });

export const formatDate = (s) => fmtDay(s, true);
export const formatRange = (from, to) => (from === to ? formatDate(from) : `${fmtDay(from)} – ${formatDate(to)}`);