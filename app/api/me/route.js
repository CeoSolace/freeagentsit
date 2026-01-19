const { NextResponse } = require('next/server');
const session = require('../../../src/server/auth/session');
const { User } = require('../../../models/User');
const { getBan } = require('../../../src/server/moderation/banService');
const { shouldShowAds } = require('../../../src/server/moderation/adsService');
const { getConfig } = require('../../../models/PricingConfig');

/*
 * API route: return information about the current user along with
 * ban status and advertising decision.  If the user is not
 * authenticated, returns null user and default advertising values.
 * Accepts an optional `path` query parameter used to determine
 * whether ads should appear on that path.
 */

async function GET(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.searchParams.get('path') || '/';
    // Extract session
    const cookiesHeader = req.headers.get('cookie') || '';
    const match = cookiesHeader.match(new RegExp(`${session.SESSION_COOKIE}=([^;]+)`));
    const sessionId = match ? match[1] : null;
    let user = null;
    let banInfo = null;
    if (sessionId) {
      const sess = session._sessions.get(sessionId);
      if (sess) {
        user = await User.findById(sess.userId);
        if (user) {
          banInfo = getBan(user.id);
        }
      }
    }
    const config = getConfig();
    const showAds = shouldShowAds(user, path, config);
    const responseData = {
      user: user ? user.toJSON() : null,
      ban: banInfo && banInfo.active ? { reasonCode: banInfo.reasonCode, reason: banInfo.reasonText, appealable: banInfo.appealable } : null,
      showAds,
    };
    return NextResponse.json(responseData);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to fetch profile' }, { status: err.status || 500 });
  }
}

module.exports = { GET };