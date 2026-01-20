/*
 * limitsService
 *
 * Enforces per-user chat creation limits based on billing plan.
 * FREE users are limited per rolling 7-day window.
 * PRO / ULT users are unlimited.
 */

let AppError;
let logger;

// ---- Safe AppError import ----
try {
  AppError = require('../common/errors').AppError;
} catch {
  AppError = class AppError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
    }
  };
}

// ---- Safe logger import ----
try {
  logger = require('../common/logger');
} catch {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
  };
}

// ---- Models ----
const Conversation = require('../../../models/Conversation');

// ✅ CORRECT PATH
let BillingStatus = null;
try {
  BillingStatus = require('../billing/models/BillingStatus');
} catch (err) {
  logger.warn('BillingStatus model not found, assuming FREE plan');
}

const MAX_FREE_NEW_CHATS_PER_WEEK = 5;

/**
 * Enforce weekly chat creation limits
 * @param {string|ObjectId} userId
 */
async function enforceNewChatLimit(userId) {
  let plan = 'FREE';

  // Resolve billing plan if model exists
  if (BillingStatus) {
    const status = await BillingStatus.findOne({ userId }).lean();
    if (status?.plan) {
      plan = status.plan.toUpperCase();
    }
  }

  // Paid plans are unlimited
  if (plan === 'PRO' || plan === 'ULT') {
    return;
  }

  // Count chats created in the last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentCount = await Conversation.countDocuments({
    participants: userId,
    createdAt: { $gte: oneWeekAgo },
  });

  if (recentCount >= MAX_FREE_NEW_CHATS_PER_WEEK) {
    logger.info(`User ${userId} hit free weekly chat limit`);
    throw new AppError(429, 'Weekly chat limit reached on Free plan');
  }
}

module.exports = {
  enforceNewChatLimit,
};
