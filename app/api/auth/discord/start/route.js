const { getOAuthUrl } = require('../../../../src/server/auth/discordOAuth');
const { NextResponse } = require('next/server');

/*
 * API route: initiate Discord OAuth.  Constructs the authorization
 * URL and redirects the client to Discord.  The state parameter is
 * generated internally by the Discord OAuth helper.  For security,
 * you may wish to persist the state in a cookie or session, but the
 * mocked implementation does not verify state.
 */

async function GET() {
  const url = getOAuthUrl();
  return NextResponse.redirect(url);
}

module.exports = { GET };