// Utility for calculating Stripe fee gross‑up.
// This module exposes a single helper that applies the
// configured flat and percentage fees to a given subtotal in order
// to recover the amount that needs to be charged to the customer.
//
// The fee structure is defined via environment variables and falls back
// to the contract defaults (1.5% + £0.20) if not provided.  The
// calculation rounds to two decimal places to ensure currency
// precision.

'use strict';

/**
 * Round a number to two decimal places.  JavaScript floating point
 * arithmetic can produce long decimals which are unacceptable when
 * dealing with currency.  Multiplying by 100 before rounding avoids
 * drift.
 *
 * @param {number} value The number to round.
 * @returns {number}
 */
function roundToPence(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Compute the grossed‑up total and associated Stripe processing fee
 * for a given subtotal.  The formula used is:
 *
 *   total = (subtotal + flatFee) / (1 - rate)
 *   stripeFee = total - subtotal
 *
 * Both the rate and flat fee can be overridden via environment
 * variables STRIPE_FEE_RATE and STRIPE_FEE_FLAT.  They default to
 * 0.015 (1.5%) and 0.20 respectively when unspecified.
 *
 * @param {number} subtotal The pre‑fee amount in pounds sterling.
 * @returns {{ total: number, fee: number }}
 */
function grossUp(subtotal) {
  const rate = parseFloat(process.env.STRIPE_FEE_RATE || '0.015');
  const flat = parseFloat(process.env.STRIPE_FEE_FLAT || '0.20');
  const total = (subtotal + flat) / (1 - rate);
  const fee = total - subtotal;
  return {
    total: roundToPence(total),
    fee: roundToPence(fee),
  };
}

module.exports = {
  grossUp,
  roundToPence,
};