// app/dashboard/page.js

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Now using alias (works with your tsconfig)
import { prisma } from '@/lib/prisma'; // Now using alias (works with your tsconfig)

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>Please log in with Discord to access your dashboard.</p>
        <a href="/api/auth/signin" className="text-blue-500">Log In</a>
      </div>
    );
  }

  // Fetch user data from Prisma (assuming User model links to email or id from session)
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: session.user.email }, // Or use id if available in session
      include: {
        listings: true, // Assuming User has relation to Listing
        teams: true,    // Assuming User owns Teams
        // Add more relations as per your schema, e.g., players
      },
    });
  } catch (error) {
    console.error('Prisma query error:', error);
    user = { listings: [], teams: [] }; // Fallback
  }

  // Fetch subscription/billing status (integrate with Stripe if BillingStatus.js handles it)
  // For example, assuming user has a stripeCustomerId field
  let billingStatus = 'Not Subscribed';
  if (user && user.stripeCustomerId) {
    // Pseudo-code: Call Stripe API or your BillingStatus utility
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    // billingStatus = subscription.status;
    billingStatus = 'Active'; // Placeholder; replace with real fetch from BillingStatus.js
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to Your Dashboard, {session.user.name}</h1>
      <p>Manage your freelance sports talent, teams, listings, and more.</p>

      {/* Quick Stats Section */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded">
            <h3 className="font-bold">Listings</h3>
            <p>{user.listings ? user.listings.length : 0}</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="font-bold">Teams</h3>
            <p>{user.teams ? user.teams.length : 0}</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="font-bold">Billing Status</h3>
            <p>{billingStatus}</p>
          </div>
        </div>
      </section>

      {/* Listings Table */}
      {user.listings && user.listings.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Your Listings</h2>
          <table className="min-w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">Title</th>
                <th className="border p-2">Description</th>
                <th className="border p-2">Price</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {user.listings.map((listing) => (
                <tr key={listing.id}>
                  <td className="border p-2">{listing.title}</td>
                  <td className="border p-2">{listing.description}</td>
                  <td className="border p-2">${listing.price}</td>
                  <td className="border p-2">
                    <a href={`/listings/${listing.id}/edit`} className="text-blue-500">Edit</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Actions Section */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Actions</h2>
        <ul className="list-disc pl-5">
          <li><a href="/billing" className="text-blue-500">Manage Billing (Stripe)</a></li>
          <li><a href="/legal" className="text-blue-500">View Legal Info</a></li>
          <li><a href="/teams/new" className="text-blue-500">Create New Team</a></li>
          <li><a href="/listings/new" className="text-blue-500">Add New Listing</a></li>
          {/* Add Discord community link if integrated */}
          <li><a href="https://discord.gg/Z2RWHCU7KM" className="text-blue-500">Join Community</a></li>
        </ul>
      </section>
    </div>
  );
}
