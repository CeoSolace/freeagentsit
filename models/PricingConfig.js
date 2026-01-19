const { AuditLog } = require('./AuditLog');

/*
 * PricingConfig stores global advertising and pricing configuration.
 * This includes a kill switch that disables all ads across the
 * platform and a per‑user override map that forces ads on or off for
 * individual users.  Changes to these settings are recorded in
 * AuditLog for traceability.  A singleton instance is exported via
 * `getConfig()`.
 */

class PricingConfig {
  constructor() {
    this.adsKillSwitch = false;
    this.userOverrides = {}; // userId -> boolean (true show ads, false hide ads)
    this.updatedAt = new Date();
  }

  toggleKillSwitch(enabled, adminUser) {
    this.adsKillSwitch = enabled;
    this.updatedAt = new Date();
    AuditLog.log(adminUser, 'ADS_KILL_SWITCH_TOGGLE', { enabled });
  }

  setUserOverride(userId, showAds, adminUser) {
    if (showAds === null || showAds === undefined) {
      delete this.userOverrides[userId];
    } else {
      this.userOverrides[userId] = !!showAds;
    }
    this.updatedAt = new Date();
    AuditLog.log(adminUser, 'USER_ADS_OVERRIDE', { userId, showAds });
  }
}

// Singleton instance
let instance;
function getConfig() {
  if (!instance) {
    instance = new PricingConfig();
  }
  return instance;
}

module.exports = { PricingConfig, getConfig };