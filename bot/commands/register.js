const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const accountView = require('./accountView');
const boostBuy = require('./boostBuy');
const boostStatus = require('./boostStatus');
const securitySetPassword = require('./securitySetPassword');
const securityLogoutAll = require('./securityLogoutAll');
const supportHelp = require('./supportHelp');

/**
 * Dynamically registers all of the bot's slash commands.
 *
 * Commands are grouped by their `group` property to create top‑level
 * application commands with subcommands. Each subcommand definition is
 * loaded from its file in the `./commands` directory. The resulting
 * application commands are registered either globally or in the
 * configured guild via the Discord REST API. A map of command
 * execution handlers is attached to the client at `client.commands`.
 *
 * @param {import('discord.js').Client} client The Discord client
 */
async function registerCommands(client) {
  // Build a registry of subcommand modules
  const subcommands = [
    accountView,
    boostBuy,
    boostStatus,
    securitySetPassword,
    securityLogoutAll,
    supportHelp,
  ];
  // Initialise the command map
  client.commands = new Map();
  const groups = {};
  for (const sub of subcommands) {
    if (!sub || !sub.group || !sub.name) continue;
    if (!groups[sub.group]) groups[sub.group] = [];
    groups[sub.group].push(sub);
  }
  const slashCommands = [];
  for (const [groupName, subs] of Object.entries(groups)) {
    const builder = new SlashCommandBuilder()
      .setName(groupName)
      .setDescription(`${groupName} commands`);
    for (const sub of subs) {
      builder.addSubcommand((sc) =>
        sc
          .setName(sub.name)
          .setDescription(sub.description || `${sub.name} command`),
      );
      // Map key is `<group>:<sub>` for handler lookup
      client.commands.set(`${groupName}:${sub.name}`, sub);
    }
    slashCommands.push(builder.toJSON());
  }
  // Register the commands with Discord via REST
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const applicationId = client.application?.id || client.user?.id;
  if (!token || !applicationId) {
    console.error('Cannot register commands: missing token or application ID');
    return;
  }
  const rest = new REST().setToken(token);
  try {
    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(applicationId, guildId),
        { body: slashCommands },
      );
    } else {
      await rest.put(Routes.applicationCommands(applicationId), { body: slashCommands });
    }
    console.log(`Registered ${slashCommands.length} application command groups`);
  } catch (err) {
    console.error('Error registering application commands:', err);
  }
}

module.exports = registerCommands;