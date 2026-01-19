// Billing page component.
//
// This React component serves as a placeholder for the billing
// dashboard.  In a full implementation it would allow users to
// choose plans, manage subscriptions and purchase boosts.  It is
// intentionally minimal for the purposes of this exercise.

'use client';

import React, { useEffect, useState } from 'react';

export default function BillingPage() {
  const [proPricing, setProPricing] = useState(null);
  const [ultPricing, setUltPricing] = useState(null);

  useEffect(() => {
    // Fetch pricing for PRO and ULT plans on mount.  The API returns
    // subtotal, fee and total which we render below.  Errors are
    // silently ignored as this is a best‑effort display.
    async function fetchPricing() {
      try {
        const proRes = await fetch('/api/billing/pricing?plan=PRO');
        if (proRes.ok) {
          setProPricing(await proRes.json());
        }
        const ultRes = await fetch('/api/billing/pricing?plan=ULT');
        if (ultRes.ok) {
          setUltPricing(await ultRes.json());
        }
      } catch (e) {
        // ignore network errors for now
      }
    }
    fetchPricing();
  }, []);

  const renderPricing = (name, pricing) => {
    if (!pricing) return <p>Loading…</p>;
    const fmt = (n) => `£${n.toFixed(2)}`;
    return (
      <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
        <h2>{name} Plan</h2>
        <p>Subtotal: {fmt(pricing.subtotal)}</p>
        <p>Processing Fee: {fmt(pricing.fee)}</p>
        <p>Total (charged): {fmt(pricing.total)}</p>
        {/* In a real implementation this button would initiate checkout */}
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Billing</h1>
      <p>Choose a plan and view its pricing breakdown.</p>
      {renderPricing('PRO', proPricing)}
      {renderPricing('ULT', ultPricing)}
    </div>
  );
}