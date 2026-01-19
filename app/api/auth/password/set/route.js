const { NextResponse } = require('next/server');
const session = require('../../../../src/server/auth/session');
const { User } = require('../../../../models/User');
const { setPassword } = require('../../../../src/server/auth/passwordAuth');

/*
 * API route: set or update the password for the currently logged in
 * user.  Requires a valid session.  Expects a JSON body with a
 * `password` field.  Returns the updated user object on success.
 */

async function POST(req) {
  try {
    const cookiesHeader = req.headers.get('cookie') || '';
    const match = cookiesHeader.match(new RegExp(`${session.SESSION_COOKIE}=([^;]+)`));
    const sessionId = match ? match[1] : null;
    if (!sessionId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const sess = session._sessions.get(sessionId);
    if (!sess) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    const user = await User.findById(sess.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
    const body = await req.json();
    const { password } = body || {};
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    setPassword(user, password);
    user.save();
    return NextResponse.json({ success: true, user: user.toJSON() });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to set password' }, { status: err.status || 500 });
  }
}

module.exports = { POST };