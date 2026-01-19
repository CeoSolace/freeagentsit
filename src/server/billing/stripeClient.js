// Stripe client wrapper.
//
// This file exports a configured instance of the Stripe SDK.  The
// secret key must be supplied via the environment variable
// STRIPE_SECRET.  The API version is pinned to ensure consistent
// behaviour across deployments.  Additional configuration options can
// be added here if required.

'use strict';

const Stripe = require('stripe');
const { logger } = require('../../utils/logger') || {};

// Pull the secret from the environment.  If it is missing an error
// will be thrown immediately; this avoids creating a misconfigured
// Stripe client.  The expected key is STRIPE_SECRET_KEY.
const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  const msg = 'STRIPE_SECRET_KEY environment variable is not set';
  if (logger && typeof logger.error === 'function') {
    logger.error(msg);
  }
  throw new Error(msg);
}

// Create the Stripe client.  The API version can be updated as
// needed but should remain fixed to avoid subtle API changes.
const stripe = new Stripe(secret, {
  apiVersion: '2022-11-15',
});

module.exports = stripe;