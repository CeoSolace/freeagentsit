/**
 * Return the current date/time as a Date object.
 *
 * @returns {Date}
 */
function now() {
  return new Date();
}

/**
 * Convert a Date or date-like value to an ISO string. If the input is
 * falsy or cannot be converted, returns undefined.
 *
 * @param {*} value Value to convert
 * @returns {string|undefined}
 */
function toISOString(value) {
  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  } catch (err) {
    return undefined;
  }
}

module.exports = { now, toISOString };