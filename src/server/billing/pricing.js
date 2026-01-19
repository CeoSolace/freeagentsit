// Pricing helpers for user plans, team subscriptions and boost purchases.
//
// This module centralises pricing logic for all billable items.  It
// computes the raw subtotal before fees as well as the grossed‑up
// total and processing fee using the feeGrossUp module.  User plans
// (FREE, PRO and ULT) have fixed monthly rates.  Team subscriptions
// combine a base fee with per‑player and optional social add‑on
// components.  Boosts are one‑off purchases whose prices can be
// defined via environment variables.

'use strict';

const { grossUp } = require('./feeGrossUp');

// Pricing for user plans in pounds per month.  These values are
// primarily sourced from environment variables.  If the variables
// are undefined we fall back to sensible defaults (FREE → 0,
// PRO → 5, ULT → 20).  This ensures the server computes the plan
// charge based on the current deployment configuration.
const USER_PLAN_PRICES = {
  FREE: 0,
  PRO: parseFloat(process.env.PLAN_PRO_MONTHLY_GBP || '5'),
  ULT: parseFloat(process.env.PLAN_ULT_MONTHLY_GBP || '20'),
};

/**
 * Calculate the pricing breakdown for a user plan.  For FREE plans
 * no fees are charged and the total will remain zero.  An unknown
 * plan name will default to FREE.
 *
 * @param {string} plan The plan identifier ('FREE', 'PRO', 'ULT').
 * @returns {{ subtotal: number, fee: number, total: number }}
 */
function userPlanPrice(plan) {
  const key = String(plan || 'FREE').toUpperCase();
  const subtotal = USER_PLAN_PRICES[key] != null ? USER_PLAN_PRICES[key] : 0;
  if (subtotal <= 0) {
    return { subtotal: 0, fee: 0, total: 0 };
  }
  const { total, fee } = grossUp(subtotal);
  return { subtotal, fee, total };
}

/**
 * Calculate the pricing breakdown for a team subscription.  The
 * calculation is:
 *   subtotal = 12 + (0.05 * activePlayers) + (socials ? 1 : 0)
 * followed by the gross‑up to include Stripe fees.
 *
 * @param {number} activePlayers The number of active players on the team.
 * @param {boolean} socials Whether the socials add‑on is enabled (£1).
 * @returns {{ subtotal: number, fee: number, total: number }}
 */
function teamSubscriptionPrice(activePlayers = 0, socials = false) {
  const playerCount = Number(activePlayers) || 0;
  // Base components derived from environment variables with
  // fallbacks to 12 (base), 0.05 (per player) and 1 (socials add‑on).
  const baseFee = parseFloat(process.env.TEAM_BASE_GBP || '12');
  const perPlayer = parseFloat(process.env.TEAM_PLAYER_UNIT_GBP || '0.05');
  const socialsAddon = parseFloat(process.env.TEAM_SOCIALS_ADDON_GBP || '1');
  const rawSubtotal = baseFee + (perPlayer * playerCount) + (socials ? socialsAddon : 0);
  const { total, fee } = grossUp(rawSubtotal);
  return { subtotal: Math.round(rawSubtotal * 100) / 100, fee, total };
}

// Default boost pricing in pounds.  These values may be overridden
// via environment variables.  The keys correspond to the duration
// values accepted by boostPrice().  When no environment variable is
// present for a given duration the fallback defaults (2, 5, 10) are
// applied.  Environment variables must use the suffix _GBP (e.g.
// BOOST_24H_GBP).
const DEFAULT_BOOST_PRICES = {
  '24h': 2,
  '72h': 5,
  '7d': 10,
};

/**
 * Resolve the configured price for a boost duration.  Environment
 * variables BOOST_24H_GBP, BOOST_72H_GBP and BOOST_7D_GBP can be
 * used to override the default values.  Unrecognised durations will
 * throw an error.
 *
 * @param {string} duration One of '24h', '72h' or '7d'.
 * @returns {number} The base price before fees.
 */
function getBoostBasePrice(duration) {
  const map = {
    '24h': parseFloat(process.env.BOOST_24H_GBP || DEFAULT_BOOST_PRICES['24h']),
    '72h': parseFloat(process.env.BOOST_72H_GBP || DEFAULT_BOOST_PRICES['72h']),
    '7d': parseFloat(process.env.BOOST_7D_GBP || DEFAULT_BOOST_PRICES['7d']),
  };
  if (!Object.prototype.hasOwnProperty.call(map, duration)) {
    throw new Error(`Unsupported boost duration: ${duration}`);
  }
  return map[duration];
}

/**
 * Calculate the pricing breakdown for a boost purchase.  Boosts are
 * charged as one‑off payments rather than subscriptions.  The
 * duration controls the base price.  Unrecognised durations will
 * result in an exception being thrown.
 *
 * @param {string} duration The boost period ('24h', '72h', '7d').
 * @returns {{ subtotal: number, fee: number, total: number }}
 */
function boostPrice(duration) {
  const subtotal = getBoostBasePrice(duration);
  const { total, fee } = grossUp(subtotal);
  return { subtotal, fee, total };
}

module.exports = {
  userPlanPrice,
  teamSubscriptionPrice,
  boostPrice,
};