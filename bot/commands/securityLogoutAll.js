module.exports = {
  group: 'security',
  name: 'logout_all',
  description: 'Log out all active sessions.',
  /**
   * Logs the user out of all active sessions by delegating to an injected
   * security service. This is usually used when an account may have
   * been compromised. A variety of method names are attempted to
   * maximise compatibility with different service implementations. On
   * success the user is notified, otherwise they are provided with
   * instructions to perform the action via the website.
   *
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {Object} services
   */
  async execute(interaction, services) {
    try {
      const userId = interaction.user.id;
      const securitySvc = services?.securityService || services?.authService;
      if (securitySvc) {
        let logoutMethod;
        if (typeof securitySvc.logoutAll === 'function') logoutMethod = securitySvc.logoutAll.bind(securitySvc);
        else if (typeof securitySvc.revokeAll === 'function') logoutMethod = securitySvc.revokeAll.bind(securitySvc);
        else if (typeof securitySvc.signOutAll === 'function') logoutMethod = securitySvc.signOutAll.bind(securitySvc);
        if (logoutMethod) {
          try {
            await logoutMethod(userId);
            await interaction.reply({ content: 'All your sessions have been logged out successfully.',
              ephemeral: true });
            return;
          } catch (err) {
            console.error('security logout_all error:', err);
            // fall through to generic error message below
          }
        }
      }
      await interaction.reply({ content: 'Unable to log out all sessions at this time. Please use the account security page on our website.',
        ephemeral: true });
    } catch (error) {
      console.error('security logout_all error:', error);
      try {
        await interaction.reply({ content: 'There was an error logging out your sessions. Please try again later.',
          ephemeral: true });
      } catch (err) {
        console.error('Failed to send security logout_all error reply:', err);
      }
    }
  },
};