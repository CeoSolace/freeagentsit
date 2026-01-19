const crypto = require('crypto');

/*
 * Discord OAuth helper module.
 *
 * This module encapsulates the logic needed to start and complete the
 * Discord OAuth2 flow.  It exposes two high‑level functions: one to
 * generate the authorization URL and another to handle the callback.
 * In production you would exchange the `code` for an access token
 * against Discord's API.  However, because this agent operates in
 * isolation without external network access, the implementation
 * returns a mock profile instead of making HTTP requests.  Feel free
 * to replace the stubbed `exchangeCodeForProfile` with a real
 * implementation if Internet connectivity is available in your
 * deployment.
 */

// Discord client configuration is read from the environment.  Only the
// client ID and redirect URI are strictly required to construct the
// authorization URL.  A client secret would be needed to exchange the
// code for an access token.
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || '';
const SCOPE = 'identify email';

// Generate a random state parameter to mitigate CSRF in the OAuth
// exchange.  This should be stored in the session and verified
// during the callback in a real implementation.
function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Construct the Discord OAuth2 authorization URL.  The returned
 * URL should be used to redirect the client to Discord.  A state
 * value is generated automatically when omitted to help prevent
 * request forgery.  The state should be stored in the user's session
 * and compared on callback.
 *
 * @param {string} [state] Optional state string
 * @returns {string} The URL to redirect the client to
 */
function getOAuthUrl(state) {
  const realState = state || generateState();
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    state: realState,
    prompt: 'consent',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange a Discord authorization code for a user profile.  In a
 * normal environment you would POST the code and client secret to
 * Discord's token endpoint and then fetch the `/users/@me` endpoint
 * using the returned access token.  Here we provide a mocked
 * implementation which synthesizes a profile from the code for
 * demonstration purposes.
 *
 * @param {string} code The authorization code returned from Discord
 * @returns {Promise<Object>} Resolves to a mock Discord profile
 */
async function exchangeCodeForProfile(code) {
  // If the code is absent or obviously invalid, throw an error.
  if (!code) {
    const err = new Error('Missing OAuth code');
    err.status = 400;
    throw err;
  }
  // Generate a deterministic but fake Discord ID from the code to
  // allow repeatable results.  In production this would come from
  // Discord's API.
  const fakeId = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex')
    .substring(0, 18);
  return {
    id: fakeId,
    username: `discord_user_${fakeId.substring(0, 6)}`,
    avatar: null,
    email: `${fakeId.substring(0, 10)}@example.com`,
    email_verified: true,
  };
}

/**
 * High level handler for the Discord OAuth callback.  Given an
 * authorization code, this function returns a normalized profile
 * object that can be consumed by the user service.  It wraps
 * `exchangeCodeForProfile` to provide a consistent error
 * signature.
 *
 * @param {string} code The authorization code from Discord
 * @returns {Promise<Object>} A simplified profile with id, username, avatar and email
 */
async function handleCallback(code) {
  try {
    const profile = await exchangeCodeForProfile(code);
    return {
      id: profile.id,
      username: profile.username,
      avatar: profile.avatar,
      email: profile.email,
      emailVerified: !!profile.email_verified,
    };
  } catch (err) {
    err.status = err.status || 500;
    throw err;
  }
}

module.exports = {
  getOAuthUrl,
  handleCallback,
  generateState,
};