const crypto = require('crypto');

/*
 * Simple in‑memory session store.  Each session associates a random
 * identifier with a user ID and optionally arbitrary session data.
 * Sessions are persisted in the `sessions` Map for the lifetime of
 * the server process.  In a real application you would use a
 * persistent store such as Redis.  The cookie name is hardcoded
 * because it must be known to both the server and the client.
 */

const SESSION_COOKIE = 'fa.sid';
const sessions = new Map();

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a new session for the specified user ID.  A session object
 * containing the user ID and timestamps is stored in memory.  The
 * session ID is sent back to the client as an HTTP‑only cookie.
 *
 * @param {Object} res Express response
 * @param {string} userId User's unique identifier
 */
function createSession(res, userId) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    userId,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  });
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    // Set a long expiry.  In production you may want to use a
    // shorter TTL and implement rotation.
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return sessionId;
}

/**
 * Destroy a user's session.  Removes the session from the store and
 * clears the cookie on the response.  Calling this on a request
 * without a session is a no‑op.
 *
 * @param {Object} req Express request
 * @param {Object} res Express response
 */
function destroySession(req, res) {
  const sessionId = req.cookies ? req.cookies[SESSION_COOKIE] : undefined;
  if (sessionId) {
    sessions.delete(sessionId);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }
}

/**
 * Retrieve the current user's session object.  If no session cookie is
 * present or the session cannot be found in the store, undefined is
 * returned.
 *
 * @param {Object} req Express request
 * @returns {Object|undefined}
 */
function getSession(req) {
  const sessionId = req.cookies ? req.cookies[SESSION_COOKIE] : undefined;
  if (!sessionId) return undefined;
  const session = sessions.get(sessionId);
  if (session) {
    session.lastSeenAt = Date.now();
  }
  return session;
}

/**
 * Express middleware that attaches the current session (if any) to
 * `req.session` and the associated user (if found) to `req.user`.
 * Users are loaded via the User model to support RBAC and other
 * checks.  Missing users result in the session being destroyed.
 */
function sessionMiddleware(UserModel) {
  return async function (req, res, next) {
    try {
      const session = getSession(req);
      if (session && session.userId) {
        const user = await UserModel.findById(session.userId);
        if (user) {
          req.session = session;
          req.user = user;
        } else {
          // User no longer exists; destroy session
          destroySession(req, res);
        }
      }
    } catch (err) {
      // Ignore session errors silently
    }
    return next();
  };
}

module.exports = {
  SESSION_COOKIE,
  createSession,
  destroySession,
  getSession,
  sessionMiddleware,
  // Expose sessions map for rare direct manipulation (e.g. Next.js routes)
  _sessions: sessions,
  // Function to destroy a session by id without needing a request/response.  Intended
  // for frameworks that cannot access Express response methods.
  terminateSession(sessionId) {
    if (sessionId) {
      sessions.delete(sessionId);
    }
  },
};