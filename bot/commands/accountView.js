const { EmbedBuilder } = require('discord.js');

module.exports = {
  group: 'account',
  name: 'view',
  description: 'View your account details.',
  /**
   * Execute the account view subcommand.
   *
   * This handler attempts to use an injected account service to fetch
   * information about the current user. If no such service exists, or if
   * the service does not expose a supported method, the handler falls
   * back to a generic message instructing the user to check the
   * website. All errors are caught and logged.
   *
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {Object} services
   */
  async execute(interaction, services) {
    // If the interaction happens outside of a guild (e.g. in a DM), simply
    // respond and return.
    try {
      const userId = interaction.user.id;
      let account;
      // Attempt to retrieve account details using a known pattern. The
      // account service may live on `services.accountService`, or it
      // might be provided on the database connection itself. We try a
      // few common conventions in sequence.
      const svc = services?.accountService || services?.userService;
      if (svc) {
        if (typeof svc.getAccount === 'function') {
          account = await svc.getAccount(userId);
        } else if (typeof svc.fetchAccount === 'function') {
          account = await svc.fetchAccount(userId);
        }
      } else if (services?.db) {
        // Attempt to query a Mongoose model if present
        const model = services.db.Account || services.db.User || services.db.Member;
        if (model && typeof model.findOne === 'function') {
          account = await model.findOne({ discordId: userId });
        }
      }

      if (!account) {
        // No account data found; provide a generic response
        const site = process.env.PUBLIC_DISCORD_INVITE_URL || 'our website';
        await interaction.reply({
          content: `We couldn't locate your account information. Please visit ${site} for full details.`,
          ephemeral: true,
        });
        return;
      }
      // Build a simple embed summarising some basic account details. We
      // intentionally avoid echoing any sensitive data back to the user.
      const embed = new EmbedBuilder()
        .setTitle('Account Details')
        .setColor(0x3498db)
        .setDescription(`Here are a few details we have on file for you:`)
        .addFields(
          { name: 'Discord Tag', value: interaction.user.tag, inline: true },
          { name: 'Discord ID', value: userId, inline: true },
        );
      // If the account object has a username or email property, include it
      if (account.username) {
        embed.addFields({ name: 'Username', value: String(account.username), inline: true });
      }
      if (account.email) {
        embed.addFields({ name: 'Email', value: String(account.email), inline: true });
      }
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('account view error:', error);
      // Always respond, even if an error occurred
      try {
        await interaction.reply({ content: 'An error occurred while fetching your account details.',
          ephemeral: true });
      } catch (err) {
        console.error('Failed to reply on account view error:', err);
      }
    }
  },
};