class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL_ERROR", extra = null) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

module.exports = AppError;
