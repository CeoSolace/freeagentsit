/**
 * Unified application error. Can be thrown to propagate an HTTP status and structured information.
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} code A unique error code
   * @param {string} message Human readable message
   * @param {number} [status=500] HTTP status code
   * @param {object} [meta] Additional metadata
   */
  constructor(code, message, status = 500, meta = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;