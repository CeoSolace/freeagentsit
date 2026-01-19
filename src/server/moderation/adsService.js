const crypto = require('crypto');

/*
 * Advertising gating logic.  This service decides whether a given
 * request should display an advertisement based on the user's
 * billing status, global configuration and per‑user overrides.
 *
 * The following rules apply:
 *  - Free users see ads nearly everywhere except on auth, billing,
 *    admin, reports and legal pages.
 *  - Pro users see ads deterministically about 50% of the time based
 *    on a hash of their user ID and the current day.  This ensures
 *    fairness and consistency within the day.
 *  - Ultimate users never see ads.
 *  - An admin kill switch can globally disable ads for all users.
 *  - Per‑user overrides may force ads on or off regardless of
 *    billing status.
 */

// Paths where ads must never be shown
const EXCLUDED_PREFIXES = [
  '/auth',
  '/billing',
  '/admin',
  '/reports',
  '/legal',
];

function isExcludedPath(path) {
  return EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Determine whether a Pro user should see ads on the current day.
function proAdDecision(userId) {
  const day = new Date().toISOString().slice(0, 10); // YYYY‑MM‑DD
  const hash = crypto.createHash('sha256').update(userId + day).digest('hex');
  // Use the last nibble to decide; 0-7 show, 8-f hide
  const lastHex = parseInt(hash.slice(-1), 16);
  return lastHex < 8;
}

/**
 * Determine if ads should be shown for the given user and request
 * path.  Accepts a PricingConfig and user object to resolve
 * overrides.  Returns a boolean.
 *
 * @param {Object|null} user The currently authenticated user or null
 * @param {string} path The request path
 * @param {Object} pricingConfig Pricing configuration model
 */
function shouldShowAds(user, path, pricingConfig) {
  // Never show ads on excluded paths
  if (isExcludedPath(path)) return false;
  // Global kill switch disables all ads
  if (pricingConfig && pricingConfig.adsKillSwitch) return false;
  // Anonymous users are treated as Free
  const billing = user && user.billingStatus ? user.billingStatus.plan : 'FREE';
  const override = pricingConfig && pricingConfig.userOverrides && user ? pricingConfig.userOverrides[user.id] : undefined;
  if (override !== undefined) {
    return !!override;
  }
  if (!user) return true; // no user -> show ads
  switch (billing) {
    case 'ULT':
      return false;
    case 'PRO':
      return proAdDecision(user.id);
    case 'FREE':
    default:
      return true;
  }
}

module.exports = {
  shouldShowAds,
  proAdDecision,
  isExcludedPath,
  EXCLUDED_PREFIXES,
};