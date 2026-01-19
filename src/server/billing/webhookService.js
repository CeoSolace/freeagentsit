// Webhook handler for Stripe events.
//
// This module exports a single function that accepts the raw body
// payload and the Stripe signature header, constructs a Stripe event
// using the configured webhook secret, and then processes the event
// based on its type.  Handling covers checkout session completion for
// user plans, team subscriptions and boost purchases, as well as
// subscription updates and deletions.  BillingStatus and Boost
// documents are updated accordingly.

'use strict';

const stripe = require('./stripeClient');
const { logger } = require('../../utils/logger') || {};
let BillingStatus;
let Boost;
try {
  // Ascend three levels from src/server/billing to the project root
  BillingStatus = require('../../../models/BillingStatus');
} catch (err) {
  BillingStatus = null;
}
try {
  Boost = require('../../../models/Boost');
} catch (err) {
  Boost = null;
}

/**
 * Construct a Stripe event from the raw body and signature header.
 * Throws if verification fails.  The webhook secret must be
 * provided via the environment variable STRIPE_WEBHOOK_SECRET.
 *
 * @param {Buffer} payload Raw request body.
 * @param {string} signature The contents of the `stripe-signature` header.
 * @returns {object} Parsed Stripe event.
 */
function constructEvent(payload, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    if (logger) logger.error('Stripe webhook signature verification failed', err);
    throw err;
  }
}

/**
 * Update or create a BillingStatus document for a user.  This helper
 * isolates the Mongoose call behind a try/catch to avoid crashing
 * webhook processing if the model is unavailable or an error occurs.
 *
 * @param {object} filter Query to match the document.
 * @param {object} update Fields to set on the document.
 */
async function upsertBillingStatus(filter, update) {
  if (!BillingStatus) return;
  try {
    await BillingStatus.findOneAndUpdate(filter, update, { new: true, upsert: true });
  } catch (err) {
    if (logger) logger.error('Failed to update BillingStatus', err);
  }
}

/**
 * Extend or create a boost entry.  The existing boostedUntil date is
 * taken into account so that purchases stack.
 *
 * @param {string} userId The user purchasing the boost.
 * @param {string} targetType What entity is being boosted.
 * @param {string} targetId Identifier of the entity.
 * @param {string} duration One of '24h', '72h' or '7d'.
 */
async function handleBoostPurchase(userId, targetType, targetId, duration) {
  if (!Boost) return;
  // Determine the number of milliseconds to add based on the duration.
  const durationMsMap = {
    '24h': 24 * 60 * 60 * 1000,
    '72h': 72 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };
  const addMs = durationMsMap[duration];
  if (!addMs) return;
  const now = Date.now();
  try {
    // Fetch the most recent boost for this target and user.
    const existing = await Boost.findOne({ user: userId, targetType, targetId }).sort({ boostedUntil: -1 }).exec();
    let baseTime = now;
    if (existing && existing.boostedUntil && existing.boostedUntil.getTime() > now) {
      baseTime = existing.boostedUntil.getTime();
    }
    const boostedUntil = new Date(baseTime + addMs);
    // Create a new boost record.  We do not update in place in order
    // to retain purchase history.
    const newBoost = new Boost({
      user: userId,
      targetType,
      targetId,
      duration,
      boostedUntil,
    });
    await newBoost.save();
  } catch (err) {
    if (logger) logger.error('Failed to create boost record', err);
  }
}

/**
 * Process a Stripe event.  Depending on the event type, update
 * billing status or create boost records.
 *
 * @param {object} event Stripe event.
 */
async function processEvent(event) {
  const { type, data } = event;
  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object;
      const metadata = session.metadata || {};
      if (!metadata.type) break;
      if (metadata.type === 'user_plan') {
        const subscriptionId = session.subscription;
        const userId = metadata.userId;
        const plan = metadata.plan;
        await upsertBillingStatus(
          { user: userId },
          {
            user: userId,
            plan,
            status: 'active',
            stripeSubscriptionId: subscriptionId,
          }
        );
      } else if (metadata.type === 'team_subscription') {
        const subscriptionId = session.subscription;
        const userId = metadata.userId;
        const teamId = metadata.teamId;
        await upsertBillingStatus(
          { team: teamId },
          {
            team: teamId,
            user: userId,
            plan: 'TEAM',
            status: 'active',
            stripeSubscriptionId: subscriptionId,
          }
        );
      } else if (metadata.type === 'boost') {
        const userId = metadata.userId;
        const targetType = metadata.targetType;
        const targetId = metadata.targetId;
        const duration = metadata.duration;
        await handleBoostPurchase(userId, targetType, targetId, duration);
      }
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = data.object;
      const status = subscription.status;
      const subscriptionId = subscription.id;
      // Attempt to find a BillingStatus with this subscription id and update its status.
      if (BillingStatus) {
        try {
          const bs = await BillingStatus.findOne({ stripeSubscriptionId: subscriptionId });
          if (bs) {
            bs.status = status === 'active' || status === 'trialing' ? 'active' : 'inactive';
            bs.save();
          }
        } catch (err) {
          if (logger) logger.error('Failed to update subscription status', err);
        }
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = data.object;
      const subscriptionId = subscription.id;
      if (BillingStatus) {
        try {
          const bs = await BillingStatus.findOne({ stripeSubscriptionId: subscriptionId });
          if (bs) {
            bs.status = 'inactive';
            bs.save();
          }
        } catch (err) {
          if (logger) logger.error('Failed to mark subscription deleted', err);
        }
      }
      break;
    }
    default:
      // Other event types are not handled.
      break;
  }
}

/**
 * Entry point for webhook handling.  Accepts the raw body as a
 * Buffer and the Stripe signature header.  After verifying the
 * signature the event will be processed.  Errors thrown here
 * propagate to the HTTP handler which should return an appropriate
 * status code.
 *
 * @param {Buffer} payload Raw request body.
 * @param {string} signature Stripe signature header.
 */
async function handleWebhook(payload, signature) {
  const event = constructEvent(payload, signature);
  await processEvent(event);
}

module.exports = {
  handleWebhook,
  constructEvent,
  processEvent,
  upsertBillingStatus,
  handleBoostPurchase,
};