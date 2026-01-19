import Nav from '../components/Nav';
import { useSession, signIn } from 'next-auth/react';

/**
 * Billing page where users can manage their subscriptions and payment
 * methods.  The actual billing workflow is handled by the `/api/billing`
 * routes and the Stripe client library.  This page simply ties the
 * frontend to the backend and displays the appropriate call‑to‑action.
 */
export default function BillingPage() {
  const { data: session, status } = useSession();

  // Render nothing on the server to avoid mismatch
  if (status === 'loading') return null;

  return (
    <div>
      <Nav />
      <main className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Billing</h1>
        {!session ? (
          <p>
            You must be signed in to manage your subscription.{' '}
            <button
              onClick={() => signIn('discord')}
              className="underline text-blue-600"
            >
              Sign in with Discord
            </button>
          </p>
        ) : (
          <div>
            <p className="mb-4">
              Manage your subscription and payment methods below.  If you
              have an active subscription, you can update or cancel it via the
              customer portal.
            </p>
            <a
              href="/api/billing/portal"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded"
            >
              Open Customer Portal
            </a>
          </div>
        )}
      </main>
    </div>
  );
}