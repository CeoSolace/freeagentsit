module.exports = {
  group: 'security',
  name: 'set_password',
  description: 'Reset or set your account password.',
  /**
   * Handles the password reset command. Discord is not an appropriate
   * channel for transmitting passwords. This handler attempts to
   * delegate to a provided security service if present; otherwise it
   * directs the user to reset their password via the website. All
   * sensitive operations are kept off the platform.
   *
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {Object} services
   */
  async execute(interaction, services) {
    try {
      const userId = interaction.user.id;
      const securitySvc = services?.securityService || services?.authService;
      if (securitySvc) {
        let resetMethod;
        if (typeof securitySvc.setPassword === 'function') resetMethod = securitySvc.setPassword.bind(securitySvc);
        else if (typeof securitySvc.resetPassword === 'function') resetMethod = securitySvc.resetPassword.bind(securitySvc);
        else if (typeof securitySvc.changePassword === 'function') resetMethod = securitySvc.changePassword.bind(securitySvc);
        if (resetMethod) {
          try {
            await resetMethod(userId);
            await interaction.reply({ content: 'A password reset has been initiated. Please check your email for further instructions.',
              ephemeral: true });
            return;
          } catch (err) {
            console.error('security set_password error:', err);
            // fall through to generic error message below
          }
        }
      }
      // If no service or method exists, fall back to instructing the user
      await interaction.reply({ content: 'To change your password, please visit our website and follow the password reset procedure.',
        ephemeral: true });
    } catch (error) {
      console.error('security set_password error:', error);
      try {
        await interaction.reply({ content: 'Unable to process your password change request right now. Please try again later.',
          ephemeral: true });
      } catch (err) {
        console.error('Failed to send security set_password error reply:', err);
      }
    }
  },
};