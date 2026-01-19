const { NextResponse } = require("next/server");

// Use alias instead of fragile relative path
const { getOAuthUrl } = require("@/src/server/auth/discordOAuth");

/*
 * API route: initiate Discord OAuth.
 * Constructs the authorization URL and redirects the client to Discord.
 */

async function GET() {
  try {
    const url = getOAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err?.message || "Failed to start Discord OAuth";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

module.exports = { GET };
