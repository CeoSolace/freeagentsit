const { NextResponse } = require('next/server');
const { User } = require('../../../../models/User');
const { verifyPassword } = require('../../../../src/server/auth/passwordAuth');
const session = require('../../../../src/server/auth/session');

/*
 * API route: log in with email and password.  Accepts a JSON body
 * containing `email` and `password`.  On success a session is
 * created and the session cookie is set.  If the user does not
 * exist, does not have a password or the password is invalid, a 401
 * error is returned.
 */

async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }
    const user = await User.findByEmail(email);
    if (!user || !user.passwordEnabled || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    // Success: update last login
    user.lastLoginAt = new Date();
    user.save();
    // Create session
    const fakeRes = { cookie() {} };
    const sessionId = session.createSession(fakeRes, user.id);
    const response = NextResponse.json({ success: true, user: user.toJSON() });
    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set(session.SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

module.exports = { POST };