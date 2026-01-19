const { EmbedBuilder } = require('discord.js');

module.exports = {
  group: 'support',
  name: 'help',
  description: 'Get assistance with FreeAgents services and commands.',
  /**
   * Presents a brief help message to the user. If a support service is
   * injected via services.supportService, an attempt is made to fetch
   * additional help content. Otherwise a generic embed is returned. A
   * public Discord invite URL can be provided via environment variables
   * and will be included as a link button.
   *
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {Object} services
   */
  async execute(interaction, services) {
    try {
      let helpText;
      const supportSvc = services?.supportService;
      if (supportSvc) {
        if (typeof supportSvc.getHelp === 'function') helpText = await supportSvc.getHelp();
        else if (typeof supportSvc.getSupportInfo === 'function') helpText = await supportSvc.getSupportInfo();
      }
      const embed = new EmbedBuilder()
        .setTitle('FreeAgents Support')
        .setColor(0x9b59b6)
        .setDescription(helpText || 'Need assistance? Use the commands below or contact our support team for help.');
      embed.addFields(
        { name: '/account view', value: 'View your account details', inline: false },
        { name: '/boost buy', value: 'Purchase a boost for your account', inline: false },
        { name: '/boost status', value: 'Check your current boost status', inline: false },
        { name: '/security set_password', value: 'Reset your account password', inline: false },
        { name: '/security logout_all', value: 'Log out from all devices', inline: false },
      );
      // Provide a link to the Discord invite if available
      const inviteURL = process.env.PUBLIC_DISCORD_INVITE_URL;
      if (inviteURL) {
        embed.addFields({ name: 'Community', value: `[Join our Discord](${inviteURL})`, inline: false });
      }
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('support help error:', error);
      try {
        await interaction.reply({ content: 'Unable to fetch help information at this time. Please try again later.',
          ephemeral: true });
      } catch (err) {
        console.error('Failed to send support help error reply:', err);
      }
    }
  },
};