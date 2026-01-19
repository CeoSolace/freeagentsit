const { attachCsrfToken, csrfProtection } = require('./csrf');
const { createRateLimiter } = require('./rateLimit');

/*
 * Combined authentication and authorization middleware.  These helpers
 * encapsulate common patterns such as requiring a logged in user or
 * blocking banned users.  They depend on `req.user` being set by
 * the session middleware in `session.js`.
 */

/**
 * Require that a user be authenticated.  If no user is present on
 * `req.user`, a 401 response is returned.  Otherwise the request
 * proceeds to the next handler.
 */
function requireAuthenticated(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Require that the current user is not banned.  If the user is banned
 * the request is aborted and the ban information is returned.  This
 * check should be inserted on routes that require an active account.
 */
function requireNotBanned(banService) {
  return function (req, res, next) {
    if (!req.user) return next();
    const banInfo = banService.getBan(req.user.id);
    if (banInfo && banInfo.active) {
      return res.status(403).json({ banned: true, reasonCode: banInfo.reasonCode, reason: banInfo.reasonText });
    }
    next();
  };
}

/**
 * Set up default rate limiters for sensitive endpoints.  The returned
 * object contains middlewares keyed by name.  Each middleware
 * enforces a fixed number of requests per minute per IP address.
 */
function setupRateLimiters() {
  return {
    auth: createRateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Too many auth requests, please try again later.' }),
    api: createRateLimiter({ windowMs: 60 * 1000, max: 120, message: 'Too many requests, please slow down.' }),
  };
}

module.exports = {
  attachCsrfToken,
  csrfProtection,
  requireAuthenticated,
  requireNotBanned,
  setupRateLimiters,
};