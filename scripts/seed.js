#!/usr/bin/env node
/*
 * Seed script for the FreeAgents platform.
 *
 * This script is designed to run after you have applied your database
 * migrations.  It performs three tasks:
 *
 *  1. Create a default pricing configuration if none exists.  The
 *     pricing configuration is used by the billing module to define
 *     subscription tiers and pricing.  If your schema defines
 *     additional fields you can modify the data object below.
 *
 *  2. Promote the user with the email `theceoion@gmail.com` to the
 *     `OWNER` role.  When this user signs up for the first time their
 *     role will be elevated automatically.
 *
 *  3. Insert a simple team, player and listing for demonstration
 *     purposes.  These records are only created if no teams exist.
 *
 * The script is idempotent: running it multiple times will not create
 * duplicate records.  Errors will be logged to the console but will
 * not stop subsequent tasks from running.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensurePricingConfig() {
  try {
    const count = await prisma.pricingConfig.count();
    if (count === 0) {
      await prisma.pricingConfig.create({
        data: {
          name: 'default',
          description: 'Default pricing configuration',
          basePrice: 0,
          currency: 'usd',
        },
      });
      console.log('Created default PricingConfig');
    } else {
      console.log('PricingConfig already exists');
    }
  } catch (err) {
    // If the model does not exist, log and continue
    console.warn('Warning: unable to ensure PricingConfig', err.message);
  }
}

async function ensureOwnerUser() {
  const ceoEmail = 'theceoion@gmail.com';
  try {
    const user = await prisma.user.findUnique({ where: { email: ceoEmail } });
    if (user && user.role !== 'OWNER') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'OWNER' },
      });
      console.log(`Promoted ${ceoEmail} to OWNER role`);
    } else if (!user) {
      console.log(`User ${ceoEmail} not found; promotion will occur on first login`);
    } else {
      console.log(`User ${ceoEmail} is already an OWNER`);
    }
  } catch (err) {
    console.warn('Warning: unable to ensure OWNER user', err.message);
  }
}

async function ensureTestData() {
  try {
    const teamCount = await prisma.team.count();
    if (teamCount === 0) {
      const team = await prisma.team.create({
        data: {
          name: 'Test Team',
          slug: 'test-team',
          description: 'Placeholder team created by seed script',
        },
      });
      const player = await prisma.player.create({
        data: {
          name: 'Test Player',
          slug: 'test-player',
          position: 'Forward',
          teamId: team.id,
        },
      });
      await prisma.listing.create({
        data: {
          title: 'Test Listing',
          description: 'Placeholder listing for demo purposes',
          price: 0,
          status: 'PENDING',
          playerId: player.id,
        },
      });
      console.log('Seeded test team, player and listing');
    } else {
      console.log('Test data already present; skipping');
    }
  } catch (err) {
    console.warn('Warning: unable to seed test data', err.message);
  }
}

async function main() {
  await ensurePricingConfig();
  await ensureOwnerUser();
  await ensureTestData();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });