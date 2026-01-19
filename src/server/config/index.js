const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env if available. This call is idempotent.
const envFile = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envFile });

/**
 * Retrieve an environment variable with an optional default.
 *
 * @param {string} key The environment variable to read
 * @param {*} [defaultValue] A default if the key is undefined
 * @returns {*} The value or the default
 */
function getConfig(key, defaultValue = undefined) {
  return process.env[key] !== undefined ? process.env[key] : defaultValue;
}

module.exports = { getConfig };