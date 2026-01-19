const { NextResponse } = require('next/server');
const session = require('../../../../../src/server/auth/session');
const { User } = require('../../../../../models/User');
const { banUser, ReasonCodes } = require('../../../../../src/server/moderation/banService');
const { AuditLog } = require('../../../../../models/AuditLog');
const { compareRoles, Roles } = require('../../../../../src/server/rbac/roles');

/*
 * API route: ban a user.  Only staff with MODERATOR role or higher
 * may perform this action.  Expects POST body with userId,
 * reasonCode and reasonText.  Returns the ban record on success.
 */

async function POST(req) {
  try {
    // Authenticate current user via session
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
    const { userId, reasonCode, reasonText } = body || {};
    if (!userId || !reasonCode) {
      return NextResponse.json({ error: 'Missing userId or reasonCode' }, { status: 400 });
    }
    if (!ReasonCodes[reasonCode]) {
      return NextResponse.json({ error: 'Invalid reason code' }, { status: 400 });
    }
    const target = await User.findById(userId);
    if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    if (target.roles && target.roles.includes(Roles.OWNER)) {
      return NextResponse.json({ error: 'Cannot ban an owner' }, { status: 403 });
    }
    const ban = banUser(userId, reasonCode, reasonText || reasonCode, currentUser);
    AuditLog.log(currentUser, 'USER_BANNED', { targetUserId: userId, reasonCode, reasonText });
    return NextResponse.json({ success: true, ban });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to ban user' }, { status: err.status || 500 });
  }
}

module.exports = { POST };