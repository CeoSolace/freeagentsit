/*
 * Simple rate limiting middleware.  Tracks requests per IP address in
 * memory.  If the number of requests within a given window exceeds
 * the configured maximum, a 429 response is returned.  This
 * implementation is sufficient for low‑traffic environments.  In a
 * distributed production deployment you would use a shared store
 * (e.g. Redis) and more sophisticated tracking.
 */

function createRateLimiter({ windowMs = 60 * 1000, max = 60, message }) {
  const requests = new Map();
  return function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    let record = requests.get(ip);
    if (!record) {
      record = { count: 1, start: now };
      requests.set(ip, record);
    } else {
      if (now - record.start > windowMs) {
        // Reset window
        record.count = 1;
        record.start = now;
      } else {
        record.count += 1;
      }
    }
    if (record.count > max) {
      res.status(429);
      res.set('Retry-After', Math.ceil(windowMs / 1000));
      res.json({ error: message || 'Too many requests' });
      return;
    }
    next();
  };
}

module.exports = { createRateLimiter };