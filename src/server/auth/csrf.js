const crypto = require('crypto');

/*
 * CSRF protection using the double submit cookie pattern.  A random
 * token is stored in a cookie and must be echoed in a custom
 * request header (`x‑csrf‑token`) on state‑changing requests.  This
 * middleware can be mounted on any route that requires CSRF
 * validation.  A second middleware attaches a token cookie if one
 * does not yet exist.
 */

const CSRF_COOKIE = 'fa.csrf';

function generateCsrfToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Middleware to ensure a CSRF cookie is set.  Should be placed early
 * in the middleware stack so that subsequent calls to `csrfProtection`
 * have a token to compare.
 */
function attachCsrfToken(req, res, next) {
  const token = req.cookies ? req.cookies[CSRF_COOKIE] : undefined;
  if (!token) {
    const newToken = generateCsrfToken();
    const secure = process.env.NODE_ENV === 'production';
    res.cookie(CSRF_COOKIE, newToken, {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
  }
  next();
}

/**
 * Middleware that validates the CSRF token on state‑changing requests
 * (i.e. non‑GET/HEAD/OPTIONS).  The token must be supplied via the
 * `x‑csrf‑token` header and must match the value stored in the
 * cookie.  Requests lacking a token or with mismatched tokens are
 * rejected with a 403 status code.
 */
function csrfProtection(req, res, next) {
  // Only enforce CSRF on unsafe methods
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }
  const cookieToken = req.cookies ? req.cookies[CSRF_COOKIE] : undefined;
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    const err = new Error('Invalid CSRF token');
    err.status = 403;
    return next(err);
  }
  return next();
}

module.exports = {
  attachCsrfToken,
  csrfProtection,
  CSRF_COOKIE,
  generateCsrfToken,
};