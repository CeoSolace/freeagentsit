const session = require('../../../../src/server/auth/session');
const { NextResponse } = require('next/server');

/*
 * API route: log out the current user.  Destroys the session and
 * clears the session cookie.  Accepts POST and GET for convenience.
 */

async function handler(req) {
  // Extract session cookie from request cookies
  const cookiesHeader = req.headers.get('cookie') || '';
  const match = cookiesHeader.match(new RegExp(`${session.SESSION_COOKIE}=([^;]+)`));
  const sessionId = match ? match[1] : null;
  if (sessionId) {
    session.terminateSession(sessionId);
  }
  const response = NextResponse.json({ success: true });
  // Clear session cookie
  response.cookies.set(session.SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
  return response;
}

// Support both GET and POST for logout
module.exports = {
  GET: handler,
  POST: handler,
};