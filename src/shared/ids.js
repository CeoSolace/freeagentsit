const { v4: uuidv4 } = require('uuid');

/**
 * Generate a new UUID (version 4).
 *
 * @returns {string} A RFC 4122 v4 UUID
 */
function newId() {
  return uuidv4();
}

// For convenience we export both names
module.exports = { newId, uuidv4 };