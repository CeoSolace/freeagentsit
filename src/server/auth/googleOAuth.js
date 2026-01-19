const crypto = require('crypto');

/*
 * Google OAuth helper module.
 *
 * Similar to the Discord OAuth module, this file encapsulates the logic
 * needed to start and complete the Google OAuth2 flow.  Google OAuth
 * will only be enabled if the requisite environment variables are
 * present.  Otherwise, functions here will throw to signal that the
 * feature should be disabled in the UI.
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// Determine whether Google OAuth should be offered.  The presence of
// both the client ID and redirect URI is treated as the signal that
// Google OAuth is configured.  The client secret is optional for the
// authorization URL but required for token exchange.
function isEnabled() {
  return !!(CLIENT_ID && REDIRECT_URI);
}

function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

function getOAuthUrl(state) {
  if (!isEnabled()) {
    throw new Error('Google OAuth not configured');
  }
  const realState = state || generateState();
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state: realState,
    prompt: 'consent',
    access_type: 'offline',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForProfile(code) {
  if (!isEnabled()) {
    const err = new Error('Google OAuth not configured');
    err.status = 400;
    throw err;
  }
  if (!code) {
    const err = new Error('Missing OAuth code');
    err.status = 400;
    throw err;
  }
  // Create a deterministic but fake Google sub to avoid hitting the
  // real Google API.  In production you would POST the code and
  // client secret to Google's token endpoint, then decode the ID
  // token to obtain the subject and profile data.
  const fakeSub = crypto.createHash('sha256').update(code).digest('hex');
  return {
    sub: fakeSub,
    name: `google_user_${fakeSub.substring(0, 6)}`,
    picture: null,
    email: `${fakeSub.substring(0, 10)}@example.com`,
    email_verified: true,
  };
}

async function handleCallback(code) {
  try {
    const profile = await exchangeCodeForProfile(code);
    return {
      sub: profile.sub,
      name: profile.name,
      picture: profile.picture,
      email: profile.email,
      emailVerified: !!profile.email_verified,
    };
  } catch (err) {
    err.status = err.status || 500;
    throw err;
  }
}

module.exports = {
  isEnabled,
  getOAuthUrl,
  handleCallback,
};