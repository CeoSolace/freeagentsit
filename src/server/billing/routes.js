// Express router exposing pricing and checkout endpoints for billing.

'use strict';

const express = require('express');
const router = express.Router();
const {
  userPlanPrice,
  teamSubscriptionPrice,
  boostPrice,
} = require('./pricing');
const {
  createUserPlanSession,
  createTeamSubscriptionSession,
  createBoostSession,
} = require('./checkoutService');
const {
  handleWebhook,
} = require('./webhookService');

// -------------------------------------------------------------------
// Pricing endpoints
//
// Compute a pricing breakdown for user plans, team subscriptions or
// boost purchases.  Each endpoint returns a JSON object containing
// subtotal, processing fee and total.  Query parameters are used
// to configure the request.

// User plan pricing (GET /billing/pricing/user?plan=PRO)
router.get('/pricing/user', (req, res) => {
  const plan = req.query.plan || 'FREE';
  const pricing = userPlanPrice(plan);
  return res.json(pricing);
});

// Team subscription pricing (GET /billing/pricing/team?activePlayers=5&socials=true)
router.get('/pricing/team', (req, res) => {
  const activePlayers = parseInt(req.query.activePlayers, 10) || 0;
  const socials = req.query.socials === 'true' || req.query.socials === '1';
  const pricing = teamSubscriptionPrice(activePlayers, socials);
  return res.json(pricing);
});

// Boost pricing (GET /billing/pricing/boost?duration=24h)
router.get('/pricing/boost', (req, res, next) => {
  const duration = req.query.duration;
  try {
    const pricing = boostPrice(duration);
    return res.json(pricing);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------------
// Checkout endpoints
//
// Create Stripe checkout sessions.  These endpoints expect the
// authenticated user to be available on req.user.  The body
// parameters depend on the type of checkout being created.  The
// response contains the session URL for redirecting the user to
// Stripe.

// User plan checkout (POST /billing/checkout/user)
router.post('/checkout/user', async (req, res, next) => {
  try {
    const plan = (req.body && req.body.plan) || 'FREE';
    const session = await createUserPlanSession(req.user, plan);
    if (!session) {
      // For free plans there is no session; respond with a flag.
      return res.json({ free: true });
    }
    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    return next(err);
  }
});

// Team subscription checkout (POST /billing/checkout/team)
router.post('/checkout/team', async (req, res, next) => {
  try {
    const body = req.body || {};
    const teamId = body.teamId;
    const activePlayers = Number(body.activePlayers) || 0;
    const socials = body.socials === true || body.socials === 'true' || body.socials === 1 || body.socials === '1';
    const team = { _id: teamId };
    const session = await createTeamSubscriptionSession(req.user, team, activePlayers, socials);
    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    return next(err);
  }
});

// Boost checkout (POST /billing/checkout/boost)
router.post('/checkout/boost', async (req, res, next) => {
  try {
    const body = req.body || {};
    const { targetType, targetId, duration } = body;
    const session = await createBoostSession(req.user, targetType, targetId, duration);
    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    return next(err);
  }
});

// -------------------------------------------------------------------
// Webhook endpoint
//
// Receives Stripe webhook events.  The body should remain unparsed
// (Buffer) so that the signature can be verified.  If the upstream
// application uses a JSON body parser globally then the raw body
// should be exposed on req.rawBody.  Failing that, we fall back to
// the parsed body serialised back to a Buffer, which will work for
// most test harnesses.
router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  // Determine the raw payload.  prefer req.rawBody if available.
  let payload;
  if (req.rawBody) {
    payload = req.rawBody;
  } else if (Buffer.isBuffer(req.body)) {
    payload = req.body;
  } else {
    payload = Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }
  try {
    await handleWebhook(payload, signature);
    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});

module.exports = router;