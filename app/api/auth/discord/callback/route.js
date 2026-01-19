const { handleCallback } = require('../../../../src/server/auth/discordOAuth');
const { User } = require('../../../../models/User');
const session = require('../../../../src/server/auth/session');
const { NextResponse } = require('next/server');

/*
 * API route: handle Discord OAuth callback.  Expects a POST body
 * containing the `code` (and optional `state`) returned by Discord.
 * Exchanges the code for a profile, then resolves or creates the
 * user in accordance with the signup rules.  Finally a session is
 * created and the session cookie is set.  The response body
 * contains the authenticated user on success.
 */

async function POST(req) {
  try {
    const body = await req.json();
    const { code } = body || {};
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }
    const profile = await handleCallback(code);
    const user = await User.upsertFromDiscord(profile);
    // Create session (store and generate ID)
    const fakeRes = { cookie() {} };
    const sessionId = session.createSession(fakeRes, user.id);
    // Build response
    const response = NextResponse.json({ success: true, user: user.toJSON() });
    // Set session cookie
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
    const status = err.status || 500;
    const message = err.message || 'OAuth callback failed';
    return NextResponse.json({ error: message }, { status });
  }
}

module.exports = { POST };