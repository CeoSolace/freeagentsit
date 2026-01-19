const { NextResponse } = require('next/server');
const session = require('../../../../../src/server/auth/session');
const { User } = require('../../../../../models/User');
const { getModerationActions } = require('../../../../../src/server/moderation/banService');
const { compareRoles, Roles } = require('../../../../../src/server/rbac/roles');

/*
 * API route: fetch moderation actions available for a given target user.
 * Requires MODERATOR role or higher for the current user.  Accepts
 * `userId` as a query parameter.  Returns an object with booleans
 * indicating whether the current user can ban, unban or appeal the
 * target user.
 */

async function GET(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const targetId = url.searchParams.get('userId');
    if (!targetId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    const cookiesHeader = req.headers.get('cookie') || '';
    const match = cookiesHeader.match(new RegExp(`${session.SESSION_COOKIE}=([^;]+)`));
    const sessionId = match ? match[1] : null;
    if (!sessionId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const sess = session._sessions.get(sessionId);
    if (!sess) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    const currentUser = await User.findById(sess.userId);
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 401 });
    const currentRole = currentUser.roles && currentUser.roles[0];
    if (!currentRole || !compareRoles(currentRole, Roles.MODERATOR)) {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
    }
    const targetUser = await User.findById(targetId);
    if (!targetUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    const actions = getModerationActions(currentUser, targetUser);
    return NextResponse.json(actions);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to fetch actions' }, { status: err.status || 500 });
  }
}

module.exports = { GET };