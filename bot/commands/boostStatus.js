const { EmbedBuilder } = require('discord.js');

module.exports = {
  group: 'boost',
  name: 'status',
  description: 'Check your current boost status.',
  /**
   * Returns the user’s boost status using an injected boost or billing service.
   * Common method names such as `getStatus`, `status` and `getBoostStatus` are
   * attempted in sequence. The response is displayed to the user in an
   * embed. Failures gracefully notify the user.
   *
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {Object} services
   */
  async execute(interaction, services) {
    try {
      const userId = interaction.user.id;
      const svc = services?.boostService || services?.billingService || services?.boost;
      if (!svc) {
        await interaction.reply({ content: 'Unable to retrieve boost status right now. Please try again later.',
          ephemeral: true });
        return;
      }
      let status;
      if (typeof svc.getStatus === 'function') status = await svc.getStatus(userId);
      else if (typeof svc.status === 'function') status = await svc.status(userId);
      else if (typeof svc.getBoostStatus === 'function') status = await svc.getBoostStatus(userId);
      else status = undefined;
      if (!status) {
        await interaction.reply({ content: 'No active boost found for your account.',
          ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle('Boost Status')
        .setColor(0x2ecc71)
        .setDescription('Here is your current boost status:')
        .addFields(
          { name: 'Boost Level', value: String(status.level || status.tier || 'N/A'), inline: true },
          { name: 'Expires At', value: status.expiresAt ? new Date(status.expiresAt).toLocaleString() : 'N/A', inline: true },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('boost status error:', error);
      try {
        await interaction.reply({ content: 'Failed to fetch your boost status. Please try again later.',
          ephemeral: true });
      } catch (err) {
        console.error('Failed to send boost status error reply:', err);
      }
    }
  },
};