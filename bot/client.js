const { Client, GatewayIntentBits, Partials } = require('discord.js');

/**
 * Create a new Discord client with sensible defaults.
 *
 * The client is configured to listen to guild and DM messages, member events
 * and message content. Partials are enabled for channels so that DM
 * interactions can be handled even if they are not cached.
 *
 * @returns {Client}
 */
function createClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });
}

module.exports = createClient;