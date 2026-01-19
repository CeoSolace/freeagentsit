const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Listens for new incident events on the injected incident service and posts
 * alerts to a configured channel. Each alert includes an embed describing
 * the incident, pings everyone in the channel, and attaches a "Sorted"
 * button. When clicked, this button is handled by the sortedFlow module.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} services
 */
module.exports = (client, services) => {
  const incidentService = services?.incidentService;
  const issueChannelId = process.env.ISSUE_CHANNEL_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!incidentService || typeof incidentService.on !== 'function') return;
  if (!issueChannelId || !guildId) return;
  incidentService.on('created', async (incident) => {
    try {
      const guild = await client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(issueChannelId);
      // Build embed summarising the incident
      const embed = new EmbedBuilder()
        .setTitle('New Incident')
        .setColor(0xe67e22)
        .setDescription(incident?.description || 'An incident has been reported.')
        .setTimestamp();
      if (incident?.id) embed.addFields({ name: 'Incident ID', value: String(incident.id), inline: true });
      if (incident?.createdBy) embed.addFields({ name: 'Reported By', value: `<@${incident.createdBy}>`, inline: true });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`incident_sorted_${incident?.id || Date.now()}`)
          .setLabel('Sorted')
          .setStyle(ButtonStyle.Primary),
      );
      await channel.send({ content: '@everyone', embeds: [embed], components: [row] });
    } catch (err) {
      console.error('Failed to post incident:', err);
    }
  });
};