const crypto = require('crypto');

/*
 * Password authentication helpers.
 *
 * Users sign up via Discord, but may optionally set a password in order
 * to allow login via email and password later.  This module provides
 * utilities to hash a password, verify a password against a stored
 * hash and set or disable the password on a user record.
 */

const HASH_ALGORITHM = 'sha256';
const SALT_BYTES = 16;

/**
 * Produce a salted hash for the given plaintext password.  A random
 * salt is generated internally.  The returned string is
 * formatted as `<salt>$<hash>` to allow easy verification later.
 *
 * @param {string} password Plaintext password
 * @returns {string} The salted hash
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto
    .createHash(HASH_ALGORITHM)
    .update(salt + password)
    .digest('hex');
  return `${salt}$${hash}`;
}

/**
 * Verify whether a given plaintext password matches a stored salted
 * hash.  Returns true if the password matches, false otherwise.
 *
 * @param {string} password Plaintext password
 * @param {string} hashed Stored salt and hash separated by '$'
 * @returns {boolean}
 */
function verifyPassword(password, hashed) {
  if (!hashed || typeof hashed !== 'string') return false;
  const [salt, digest] = hashed.split('$');
  if (!salt || !digest) return false;
  const hash = crypto
    .createHash(HASH_ALGORITHM)
    .update(salt + password)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(digest));
}

/**
 * Set a password on a user record.  This function updates the
 * `passwordHash` and `passwordEnabled` fields on the user.  It does
 * not save the user to the database; callers should persist
 * afterwards.
 *
 * @param {Object} user User record
 * @param {string} password Plaintext password
 */
function setPassword(user, password) {
  user.passwordHash = hashPassword(password);
  user.passwordEnabled = true;
}

/**
 * Disable the password on a user record.  This clears the stored
 * password hash and marks the account as password disabled.
 *
 * @param {Object} user User record
 */
function disablePassword(user) {
  user.passwordHash = null;
  user.passwordEnabled = false;
}

module.exports = {
  hashPassword,
  verifyPassword,
  setPassword,
  disablePassword,
};