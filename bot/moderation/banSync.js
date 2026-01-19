const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Synchronises bans from an external service to Discord. When a ban event
 * is emitted by the injected ban service, the corresponding member is
 * stripped of their member role, granted the lock role, and notified via
 * DM with the ban reason. If the ban is appealable, the DM includes an
 * appeal button which triggers the appeal flow.
 *
 * If an unban event is emitted, the lock role is removed and the member
 * role restored. All errors are caught and logged to avoid crashing
 * the bot.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} services
 */
module.exports = (client, services) => {
  const banService = services?.banService;
  const guildId = process.env.DISCORD_GUILD_ID;
  const lockRoleId = process.env.DISCORD_LOCK_ROLE_ID;
  const memberRoleId = process.env.DISCORD_MEMBER_ROLE_ID;
  if (!banService || typeof banService.on !== 'function') {
    return;
  }

  // Listen for ban events
  banService.on('ban', async (banInfo) => {
    try {
      const { userId, reason, appealable } = banInfo || {};
      if (!userId) return;
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return;
      // Remove member role and add lock role
      if (memberRoleId) {
        await member.roles.remove(memberRoleId).catch(() => {});
      }
      if (lockRoleId) {
        await member.roles.add(lockRoleId).catch(() => {});
      }
      // Build DM embed
      const embed = new EmbedBuilder()
        .setTitle('You have been banned')
        .setColor(0xe74c3c)
        .setDescription(reason ? `Reason: ${reason}` : 'No reason was provided.');
      const components = [];
      if (appealable) {
        const appealButton = new ButtonBuilder()
          .setCustomId(`appeal_start_${userId}`)
          .setLabel('Appeal')
          .setStyle(ButtonStyle.Primary);
        components.push(new ActionRowBuilder().addComponents(appealButton));
      }
      await member.send({ embeds: [embed], components }).catch(() => {});
    } catch (error) {
      console.error('banSync ban error:', error);
    }
  });
  // Listen for unban events
  banService.on('unban', async (unbanInfo) => {
    try {
      const { userId } = unbanInfo || {};
      if (!userId) return;
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return;
      // Remove lock role and restore member role
      if (lockRoleId) {
        await member.roles.remove(lockRoleId).catch(() => {});
      }
      if (memberRoleId) {
        await member.roles.add(memberRoleId).catch(() => {});
      }
      await member.send({ content: 'You have been unbanned. Welcome back!' }).catch(() => {});
    } catch (error) {
      console.error('banSync unban error:', error);
    }
  });
};