// Service responsible for creating Stripe checkout sessions for
// various billing flows.  Each function returns a promise that
// resolves to either a Checkout Session object (for paid plans and
// purchases) or null for free plans where no payment is required.

'use strict';

const stripe = require('./stripeClient');
const { userPlanPrice, teamSubscriptionPrice, boostPrice } = require('./pricing');
const { AppError } = require('../../utils/appError') || {};
const logger = (require('../../utils/logger') || {}).logger;

// Attempt to load the BillingStatus model.  This may not be present
// during unit tests, so catch any require errors and fall back to
// undefined.
let BillingStatus;
try {
  // Resolve the BillingStatus model from the project root.  This file
  // lives in src/server/billing so we need to ascend three levels.
  BillingStatus = require('../../../models/BillingStatus');
} catch (err) {
  BillingStatus = null;
}

/**
 * Build a success URL for Stripe checkout sessions.  Uses the
 * FRONTEND_URL environment variable to construct a redirect to the
 * billing success page.  Stripe replaces {CHECKOUT_SESSION_ID} with
 * the actual session id on redirect.
 *
 * @returns {string}
 */
function buildSuccessUrl() {
  const base = process.env.FRONTEND_URL || '';
  return `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
}

/**
 * Build a cancel URL for Stripe checkout sessions.  Uses the
 * FRONTEND_URL environment variable to construct a redirect to the
 * billing cancellation page.
 *
 * @returns {string}
 */
function buildCancelUrl() {
  const base = process.env.FRONTEND_URL || '';
  return `${base}/billing/cancel`;
}

/**
 * Create a Stripe checkout session for a user's plan upgrade.  Free
 * plans do not create a session; instead the billing status is
 * updated immediately to reflect the plan activation.  The session
 * includes metadata that identifies the user and plan so the
 * webhook can process it appropriately.
 *
 * @param {Object} user The authenticated user object.  Must have
 *                      `_id` and `email` fields.
 * @param {string} plan The desired plan ('FREE', 'PRO', 'ULT').
 * @returns {Promise<object|null>} The Stripe session or null for FREE.
 */
async function createUserPlanSession(user, plan) {
  const pricing = userPlanPrice(plan);
  if (!user || !user._id) {
    throw new Error('User is required to create a plan session');
  }
  // If the total is zero then no payment is required.
  if (pricing.total <= 0) {
    if (BillingStatus) {
      try {
        await BillingStatus.findOneAndUpdate(
          { user: user._id },
          { plan: plan || 'FREE', status: 'active', stripeSubscriptionId: null },
          { new: true, upsert: true }
        );
      } catch (err) {
        if (logger) logger.error('Failed to update BillingStatus for free plan', err);
      }
    }
    return null;
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${plan.toUpperCase()} Plan`,
          },
          recurring: {
            interval: 'month',
          },
          unit_amount: Math.round(pricing.total * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'user_plan',
      plan: plan.toUpperCase(),
      userId: String(user._id),
      subtotal: pricing.subtotal.toString(),
      fee: pricing.fee.toString(),
      total: pricing.total.toString(),
    },
    customer_email: user.email || undefined,
    success_url: buildSuccessUrl(),
    cancel_url: buildCancelUrl(),
  });
  return session;
}

/**
 * Create a checkout session for a team subscription.  The pricing
 * includes base, per‑player and optional social add‑ons.  The team
 * identifier must be included in the metadata to allow the webhook
 * handler to associate the subscription with the correct team.
 *
 * @param {Object} user The authenticated user initiating the purchase.
 * @param {Object} team The team object; must have `_id`.
 * @param {number} activePlayers Number of active players.
 * @param {boolean} socials Whether socials add‑on is selected.
 * @returns {Promise<object>} The Stripe session.
 */
async function createTeamSubscriptionSession(user, team, activePlayers = 0, socials = false) {
  if (!user || !user._id) {
    throw new Error('User is required to create a team subscription session');
  }
  if (!team || !team._id) {
    throw new Error('Team is required to create a team subscription session');
  }
  const pricing = teamSubscriptionPrice(activePlayers, socials);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Team Subscription',
          },
          recurring: {
            interval: 'month',
          },
          unit_amount: Math.round(pricing.total * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'team_subscription',
      teamId: String(team._id),
      userId: String(user._id),
      activePlayers: String(activePlayers),
      socials: socials ? 'true' : 'false',
      subtotal: pricing.subtotal.toString(),
      fee: pricing.fee.toString(),
      total: pricing.total.toString(),
    },
    customer_email: user.email || undefined,
    success_url: buildSuccessUrl(),
    cancel_url: buildCancelUrl(),
  });
  return session;
}

/**
 * Create a checkout session for a boost purchase.  Boosts are
 * one‑off payments (mode: 'payment').  Metadata includes the
 * targeted entity and the duration of the boost.
 *
 * @param {Object} user The authenticated user.
 * @param {string} targetType The type of entity being boosted ('player', 'team', 'listing', 'creator').
 * @param {string|number} targetId The identifier of the entity.
 * @param {string} duration The boost period ('24h', '72h', '7d').
 * @returns {Promise<object>} The Stripe session.
 */
async function createBoostSession(user, targetType, targetId, duration) {
  if (!user || !user._id) {
    throw new Error('User is required to create a boost session');
  }
  const pricing = boostPrice(duration);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${duration} Boost`,
          },
          unit_amount: Math.round(pricing.total * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'boost',
      duration,
      userId: String(user._id),
      targetType: targetType,
      targetId: String(targetId),
      subtotal: pricing.subtotal.toString(),
      fee: pricing.fee.toString(),
      total: pricing.total.toString(),
    },
    customer_email: user.email || undefined,
    success_url: buildSuccessUrl(),
    cancel_url: buildCancelUrl(),
  });
  return session;
}

module.exports = {
  createUserPlanSession,
  createTeamSubscriptionSession,
  createBoostSession,
};