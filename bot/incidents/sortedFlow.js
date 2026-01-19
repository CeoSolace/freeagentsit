const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

/**
 * Handles the "Sorted" button on incident alerts. When staff click the
 * button, the incident is marked as resolved via the injected
 * incidentService, a resolution message is posted to the configured
 * error fix channel, and the button is disabled. Permission checks
 * ensure only users with Manage Guild or Administrator rights can
 * resolve incidents.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} services
 */
module.exports = (client, services) => {
  const incidentService = services?.incidentService;
  const guildId = process.env.DISCORD_GUILD_ID;
  const fixChannelId = process.env.ERROR_ALERT_FIX_CHANNEL_ID;
  const pingRoleId = process.env.ERROR_PING_ID;
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const customId = interaction.customId;
    if (!customId.startsWith('incident_sorted_')) return;
    const incidentId = customId.substring('incident_sorted_'.length);
    // Permission check
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'You do not have permission to resolve this incident.',
        ephemeral: true });
      return;
    }
    // Mark as resolved via service
    try {
      if (incidentService) {
        if (typeof incidentService.resolve === 'function') {
          await incidentService.resolve(incidentId, { resolvedBy: interaction.user.id });
        } else if (typeof incidentService.markResolved === 'function') {
          await incidentService.markResolved(incidentId, { resolvedBy: interaction.user.id });
        }
      }
    } catch (err) {
      console.error('Error resolving incident via service:', err);
    }
    // Send resolution message
    if (fixChannelId) {
      try {
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(fixChannelId);
        const embed = new EmbedBuilder()
          .setTitle('Incident Resolved')
          .setColor(0x2ecc71)
          .setDescription(`Incident ${incidentId} has been marked as resolved by <@${interaction.user.id}>.`)
          .setTimestamp();
        const content = pingRoleId ? `<@&${pingRoleId}>` : undefined;
        await channel.send({ content, embeds: [embed] });
      } catch (err) {
        console.error('Failed to post incident resolution message:', err);
      }
    }
    // Disable the sorted button
    try {
      const disabledButton = ButtonBuilder.from(interaction.component).setDisabled(true);
      const row = new ActionRowBuilder().addComponents(disabledButton);
      await interaction.update({ components: [row] });
    } catch (err) {
      console.error('Error disabling sorted button:', err);
      try {
        await interaction.reply({ content: 'Error marking incident as sorted.',
          ephemeral: true });
      } catch {}
    }
  });
};