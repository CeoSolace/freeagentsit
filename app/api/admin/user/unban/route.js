const { NextResponse } = require('next/server');
const session = require('../../../../../src/server/auth/session');
const { User } = require('../../../../../models/User');
const { unbanUser } = require('../../../../../src/server/moderation/banService');
const { AuditLog } = require('../../../../../models/AuditLog');
const { compareRoles, Roles } = require('../../../../../src/server/rbac/roles');

/*
 * API route: unban a user.  Requires MODERATOR role or higher.
 * Accepts POST body with userId.  Returns the updated ban record.
 */

async function POST(req) {
  try {
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
    const body = await req.json();
    const { userId } = body || {};
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    const target = await User.findById(userId);
    if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    const ban = unbanUser(userId, currentUser);
    AuditLog.log(currentUser, 'USER_UNBANNED', { targetUserId: userId });
    return NextResponse.json({ success: true, ban });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to unban user' }, { status: err.status || 500 });
  }
}

module.exports = { POST };