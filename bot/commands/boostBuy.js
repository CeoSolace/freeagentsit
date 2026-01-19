module.exports = {
  group: 'boost',
  name: 'buy',
  description: 'Purchase a boost for your account.',
  /**
   * Attempts to purchase a boost using whatever billing or boost service is
   * injected via the services object. The handler tries several common
   * method names before giving up gracefully. If the purchase succeeds,
   * an acknowledgement is sent back to the user. Failures are logged and
   * reported back to the user.
   *
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {Object} services
   */
  async execute(interaction, services) {
    try {
      const userId = interaction.user.id;
      // Locate a suitable service. It may be called boostService,
      // billingService, or boost.
      const svc = services?.boostService || services?.billingService || services?.boost;
      if (!svc) {
        await interaction.reply({ content: 'Boost purchases are currently unavailable. Please try again later.',
          ephemeral: true });
        return;
      }
      // Choose a purchase method if available
      let purchaseMethod;
      if (typeof svc.buy === 'function') purchaseMethod = svc.buy.bind(svc);
      else if (typeof svc.purchase === 'function') purchaseMethod = svc.purchase.bind(svc);
      else if (typeof svc.purchaseBoost === 'function') purchaseMethod = svc.purchaseBoost.bind(svc);
      if (!purchaseMethod) {
        await interaction.reply({ content: 'Boost purchasing is not supported at this time.',
          ephemeral: true });
        return;
      }
      // Attempt the purchase
      await purchaseMethod(userId);
      await interaction.reply({ content: 'Your boost has been purchased successfully! Thank you for your support.',
        ephemeral: true });
    } catch (error) {
      console.error('boost buy error:', error);
      try {
        await interaction.reply({ content: 'There was an issue processing your boost purchase. Please try again later.',
          ephemeral: true });
      } catch (err) {
        console.error('Failed to send boost buy error reply:', err);
      }
    }
  },
};