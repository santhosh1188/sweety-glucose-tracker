const AppError = require('../utils/AppError');
const { todayString, isValidDateString } = require('../utils/dates');

const SLOT_LABELS = {
  morning_fasting: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};
const MAX_READINGS_PER_DAY = 4;

const article = (label) => (/^[aeiou]/i.test(label) ? 'an' : 'a');

function validateReadingInput({ date, slot, value }) {
  if (value === undefined || value === null || value === '') {
    throw new AppError(400, 'Please enter a glucose value.');
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 40 || n > 600) {
    throw new AppError(400, 'Value must be between 40 and 600 mg/dl.');
  }
  if (!SLOT_LABELS[slot]) throw new AppError(400, 'Please choose a valid time slot.');
  if (!isValidDateString(date)) throw new AppError(400, 'Please enter a valid date.');
  if (date > todayString()) throw new AppError(400, 'Date cannot be in the future.');
  return { date, slot, value: n };
}

const duplicateSlotMessage = (slot) =>
  `You already have ${article(SLOT_LABELS[slot])} ${SLOT_LABELS[slot]} reading for this date.`;

module.exports = { validateReadingInput, duplicateSlotMessage, SLOT_LABELS, MAX_READINGS_PER_DAY };