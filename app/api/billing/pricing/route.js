// API route for pricing calculations.
//
// This endpoint supports three modes depending on the query
// parameters supplied:
//   • ?plan=PRO – returns user plan pricing.
//   • ?activePlayers=5&socials=true – returns team subscription pricing.
//   • ?duration=24h – returns boost pricing.
// If none of these parameters are provided a 400 response will be
// returned.

import { NextResponse } from 'next/server';

// Use CommonJS require for server side modules.  Next.js still
// supports require() in route handlers.
const { userPlanPrice, teamSubscriptionPrice, boostPrice } = require('../../../../src/server/billing/pricing');

export async function GET(req) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  try {
    // User plan pricing when a plan parameter is present.
    const plan = searchParams.get('plan');
    if (plan) {
      const pricing = userPlanPrice(plan);
      return NextResponse.json(pricing);
    }
    // Team subscription pricing when activePlayers is present.
    const activePlayersParam = searchParams.get('activePlayers');
    const duration = searchParams.get('duration');
    if (activePlayersParam !== null || searchParams.get('socials') !== null) {
      const activePlayers = parseInt(activePlayersParam || '0', 10);
      const socials = searchParams.get('socials') === 'true' || searchParams.get('socials') === '1';
      const pricing = teamSubscriptionPrice(activePlayers, socials);
      return NextResponse.json(pricing);
    }
    // Boost pricing when a duration is present.
    if (duration) {
      const pricing = boostPrice(duration);
      return NextResponse.json(pricing);
    }
    // Unknown parameters – bad request.
    return NextResponse.json({ error: 'Invalid pricing query' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}