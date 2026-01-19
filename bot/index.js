const createClient = require("./client");
const registerCommands = require("./commands/register");
const banSync = require("./moderation/banSync");
const appeals = require("./moderation/appeals");
const incidentPoster = require("./incidents/incidentPoster");
const sortedFlow = require("./incidents/sortedFlow");

/**
 * Starts the Discord bot.
 *
 * Fail-soft rules:
 * - Missing token => do not throw, just return null.
 * - Subsystem init errors => log and continue.
 * - Command execution errors => reply safely without crashing the bot.
 */
async function startBot({ services } = {}) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn("DISCORD_BOT_TOKEN is not set; bot will not start");
    return null;
  }

  const client = createClient();

  // Attach services + command map for downstream handlers
  client.services = services || {};
  client.commands = client.commands || new Map();

  client.once("ready", async () => {
    console.log(`Bot logged in as ${client.user.tag}`);

    // Register slash commands and load command handlers
    try {
      await registerCommands(client);
    } catch (err) {
      console.error("Failed to register slash commands:", err);
    }

    // Initialise subsystems (fail-soft)
    try {
      banSync(client, client.services);
    } catch (err) {
      console.error("banSync initialisation error:", err);
    }

    try {
      appeals(client, client.services);
    } catch (err) {
      console.error("appeals initialisation error:", err);
    }

    try {
      incidentPoster(client, client.services);
    } catch (err) {
      console.error("incidentPoster initialisation error:", err);
    }

    try {
      sortedFlow(client, client.services);
    } catch (err) {
      console.error("sortedFlow initialisation error:", err);
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;

    let subcommand;
    try {
      subcommand = interaction.options.getSubcommand(false);
    } catch {
      subcommand = undefined;
    }

    const key = subcommand ? `${commandName}:${subcommand}` : commandName;
    const command = client.commands.get(key);

    if (!command || typeof command.execute !== "function") {
      try {
        await interaction.reply({ content: "Unknown command.", ephemeral: true });
      } catch (err) {
        console.error("Failed to reply to unknown command:", err);
      }
      return;
    }

    try {
      await command.execute(interaction, client.services);
    } catch (err) {
      console.error(`Error executing command ${key}:`, err);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "An unexpected error occurred while executing this command.",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "An unexpected error occurred while executing this command.",
            ephemeral: true,
          });
        }
      } catch (replyErr) {
        console.error("Failed to send error response:", replyErr);
      }
    }
  });

  // Login (fail-soft)
  try {
    await client.login(token);
  } catch (err) {
    console.error("Discord login failed:", err);
    return null;
  }

  return client;
}

module.exports = { startBot };
