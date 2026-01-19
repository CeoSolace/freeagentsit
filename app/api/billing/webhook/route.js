// API route to handle Stripe webhooks.
//
// This route must receive the raw request body in order to verify
// the signature.  It reads the request as an ArrayBuffer, converts
// it to a Buffer and passes it to the webhookService for
// verification and processing.  Any errors during verification
// result in a 400 response.

import { NextResponse } from 'next/server';

const { handleWebhook } = require('../../../../src/server/billing/webhookService');

export async function POST(req) {
  // Stripe requires the raw body for signature verification.
  const buf = await req.arrayBuffer();
  const payload = Buffer.from(buf);
  const signature = req.headers.get('stripe-signature');
  try {
    await handleWebhook(payload, signature);
    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }
}