const { NextResponse } = require('next/server');
const session = require('../../../../../src/server/auth/session');
const { User } = require('../../../../../models/User');
const { getConfig } = require('../../../../../models/PricingConfig');
const { compareRoles, Roles } = require('../../../../../src/server/rbac/roles');

/*
 * API route: toggle the global ads kill switch.  Requires ADMIN role
 * or higher.  Accepts POST body with a boolean `enabled` to indicate
 * whether ads should be disabled.  Logs the change to the audit log
 * via the PricingConfig model.
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
    if (!currentRole || !compareRoles(currentRole, Roles.ADMIN)) {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
    }
    const body = await req.json();
    const { enabled } = body || {};
    const config = getConfig();
    config.toggleKillSwitch(!!enabled, currentUser);
    return NextResponse.json({ success: true, adsKillSwitch: config.adsKillSwitch });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to toggle kill switch' }, { status: err.status || 500 });
  }
}

module.exports = { POST };