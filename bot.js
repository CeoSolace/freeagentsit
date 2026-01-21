// bot.js - Kept minimal, efficient, error-resilient
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Message, Partials.Channel]
});

client.once('ready', () => {
  console.log(`Bot ready as ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== process.env.DISCORD_GUILD_ID) return;
  try {
    await member.roles.add(process.env.DISCORD_MEMBER_ROLE_ID);
  } catch (error) {
    console.error('Role add error:', error);
  }
});

client.on('error', (error) => {
  console.error('Bot error:', error);
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);
