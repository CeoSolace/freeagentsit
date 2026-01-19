const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

/**
 * Handles ban appeal interactions. When a banned user clicks the appeal
 * button provided in their ban notification, a DM conversation is
 * initiated. The bot asks a series of questions and, upon completion,
 * posts a summary embed to the configured appeals channel. Staff can
 * then click buttons on that embed to approve, reject or request more
 * information. Permissions are checked before allowing staff actions.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} services
 */
module.exports = (client, services) => {
  const appealChannelId = process.env.DISCORD_APPEAL_CHANNEL_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!appealChannelId) return;

  // Track active appeals: userId -> { step, answers }
  const activeAppeals = new Map();

  // List of questions to ask during an appeal
  const questions = [
    'Why do you believe you were banned?',
    'Why should your ban be lifted?',
    'Any additional information you would like to provide?',
  ];

  /**
   * Sends the next question in the appeal to the user.
   *
   * @param {import('discord.js').User} user
   * @param {string} userId
   */
  async function sendNextQuestion(user, userId) {
    const appeal = activeAppeals.get(userId);
    if (!appeal) return;
    const idx = appeal.step;
    if (idx < questions.length) {
      try {
        await user.send(questions[idx]);
      } catch (err) {
        console.error('Failed to send appeal question:', err);
      }
    }
  }

  // Handle button interactions
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const customId = interaction.customId;
    // Ban appeal start button clicked by banned user
    if (customId.startsWith('appeal_start_')) {
      const userId = customId.substring('appeal_start_'.length);
      // Ensure only the banned user can click the appeal button
      if (interaction.user.id !== userId) {
        await interaction.reply({ content: 'You cannot use this appeal button.',
          ephemeral: true });
        return;
      }
      if (activeAppeals.has(userId)) {
        await interaction.reply({ content: 'Your appeal is already in progress.',
          ephemeral: true });
        return;
      }
      activeAppeals.set(userId, { step: 0, answers: [] });
      await interaction.reply({ content: 'Starting appeal. Please check your DMs.',
        ephemeral: true });
      try {
        const user = await client.users.fetch(userId);
        await user.send('Thank you for choosing to appeal your ban. Please answer the following questions:');
        await sendNextQuestion(user, userId);
      } catch (err) {
        console.error('Failed to start appeal DM conversation:', err);
      }
      return;
    }
    // Staff actions on appeal embeds: approve, reject, request more info
    if (customId.startsWith('appeal_staff_')) {
      const parts = customId.split('_');
      const action = parts[2];
      const targetId = parts.slice(3).join('_');
      // Permission check: ManageGuild or Administrator
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
          !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({ content: 'You do not have permission to perform this action.',
          ephemeral: true });
        return;
      }
      if (!targetId) {
        await interaction.reply({ content: 'Invalid appeal reference.',
          ephemeral: true });
        return;
      }
      try {
        if (action === 'approve') {
          // Use banService to unban
          const banService = services?.banService;
          if (banService) {
            if (typeof banService.unban === 'function') {
              await banService.unban(targetId);
            } else if (typeof banService.unbanUser === 'function') {
              await banService.unbanUser(targetId);
            }
          }
          // Restore roles
          const guild = await client.guilds.fetch(guildId);
          const member = await guild.members.fetch(targetId).catch(() => null);
          if (member) {
            const lockRoleId = process.env.DISCORD_LOCK_ROLE_ID;
            const memberRoleId = process.env.DISCORD_MEMBER_ROLE_ID;
            if (lockRoleId) await member.roles.remove(lockRoleId).catch(() => {});
            if (memberRoleId) await member.roles.add(memberRoleId).catch(() => {});
            await member.send({ content: 'Your appeal has been approved. You have been unbanned.' }).catch(() => {});
          }
          await interaction.update({ content: `Appeal approved by ${interaction.user.tag}.`, components: [] });
        } else if (action === 'reject') {
          const user = await client.users.fetch(targetId).catch(() => null);
          if (user) {
            await user.send({ content: 'Your appeal has been rejected. You remain banned.' }).catch(() => {});
          }
          await interaction.update({ content: `Appeal rejected by ${interaction.user.tag}.`, components: [] });
        } else if (action === 'more') {
          const user = await client.users.fetch(targetId).catch(() => null);
          if (user) {
            await user.send({ content: 'The staff require more information regarding your appeal. Please reply with any additional details.' }).catch(() => {});
          }
          await interaction.update({ content: `Additional information requested by ${interaction.user.tag}.`, components: [] });
        } else {
          await interaction.reply({ content: 'Unknown action.',
            ephemeral: true });
        }
      } catch (err) {
        console.error('Error handling staff appeal button:', err);
        try {
          await interaction.reply({ content: 'An error occurred processing this action.',
            ephemeral: true });
        } catch {}
      }
    }
  });

  // Handle DM messages for active appeals
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.guild) return; // Only handle DMs
    const userId = message.author.id;
    const appeal = activeAppeals.get(userId);
    if (!appeal) return;
    // Store answer and increment step
    appeal.answers.push(message.content);
    appeal.step += 1;
    if (appeal.step < questions.length) {
      await sendNextQuestion(message.author, userId);
    } else {
      // Appeal completed
      activeAppeals.delete(userId);
      try {
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(appealChannelId);
        // Build the appeal summary embed
        const embed = new EmbedBuilder()
          .setTitle('Ban Appeal')
          .setColor(0xf1c40f)
          .setDescription(`Appeal submitted by <@${userId}>`)
          .addFields(
            { name: 'Q1', value: appeal.answers[0] || 'No answer provided', inline: false },
            { name: 'Q2', value: appeal.answers[1] || 'No answer provided', inline: false },
            { name: 'Q3', value: appeal.answers[2] || 'No answer provided', inline: false },
          )
          .setFooter({ text: `User ID: ${userId}` })
          .setTimestamp();
        // Build the staff action buttons
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`appeal_staff_approve_${userId}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`appeal_staff_reject_${userId}`)
            .setLabel('Reject')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`appeal_staff_more_${userId}`)
            .setLabel('Request more info')
            .setStyle(ButtonStyle.Primary),
        );
        await channel.send({ embeds: [embed], components: [row] });
        await message.author.send('Your appeal has been submitted. Our staff will review it shortly.').catch(() => {});
      } catch (err) {
        console.error('Failed to send appeal summary:', err);
        try {
          await message.author.send('There was an error submitting your appeal. Please contact a moderator.').catch(() => {});
        } catch {}
      }
    }
  });
};