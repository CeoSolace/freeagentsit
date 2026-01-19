"use client";
import { useEffect, useState } from 'react';

/*
 * Pricing page.  Displays subscription tiers and calls out to the
 * billing API provided by Agent C to fetch the current pricing
 * configuration.  Until that API responds, placeholder values are
 * shown.  This component is a client component because it performs
 * data fetching at runtime.
 */

export const metadata = {
  title: 'Pricing',
};

export default function PricingPage() {
  const [pricing, setPricing] = useState(null);
  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch('/api/billing/pricing');
        const data = await res.json();
        if (res.ok) setPricing(data);
      } catch (err) {
        // ignore errors; keep placeholder
      }
    }
    fetchPricing();
  }, []);
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Pricing</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Plan</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Features</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>Free</td>
            <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>Access with ads</td>
            <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>Free</td>
          </tr>
          <tr>
            <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>Pro</td>
            <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>Fewer ads and premium features</td>
            <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{pricing?.proPrice || '$9.99/mo'}</td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Ultimate</td>
            <td style={{ padding: '0.5rem' }}>No ads and all features</td>
            <td style={{ padding: '0.5rem' }}>{pricing?.ultPrice || '$19.99/mo'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}