/**
 * Safely parse a JSON string. If parsing fails, returns the provided
 * fallback value instead of throwing.
 *
 * @param {string} str JSON string to parse
 * @param {*} [fallback=null] Value to return if JSON.parse throws
 * @returns {*} Parsed JSON object or fallback
 */
function safeJson(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (err) {
    return fallback;
  }
}

/**
 * Safely stringify a value to JSON. If serialization fails, returns
 * an empty string.
 *
 * @param {*} value Value to stringify
 * @returns {string} JSON string or empty string
 */
function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (err) {
    return '';
  }
}

module.exports = { safeJson, safeStringify };