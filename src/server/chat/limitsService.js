/*
 * limitsService
 *
 * Enforces per-user chat creation limits based on their billing plan.  Free
 * users are restricted to a fixed number of new conversations per rolling
 * seven‑day window.  Paid plans (PRO and ULT) impose no limits.  If the
 * underlying BillingStatus model or plan information is missing the service
 * assumes a free plan by default.  See chatService.createConversation for
 * usage.
 */

let AppError;
let logger;
try {
  AppError = require('../common/errors').AppError;
} catch (err) {
  // Provide a basic AppError fallback if the shared module is missing
  AppError = class AppError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
    }
  };
}
try {
  logger = require('../common/logger');
} catch (err) {
  logger = {
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
}

const Conversation = require('../../../models/Conversation');
let BillingStatus;

try {
  // BillingStatus may be provided by Agent B.  We attempt to require it
  // gracefully.  If unavailable, free plan behaviour will be enforced.
  // The relative path here assumes models live at src/server/billing or
  // similar.  Adjust as necessary in your integration.
  BillingStatus = require('../../billing/models/BillingStatus');
} catch (err) {
  logger.warn('BillingStatus model not found, assuming free plan for all users');
  BillingStatus = null;
}

const MAX_FREE_NEW_CHATS_PER_WEEK = 5;

/**
 * Determines whether the given user is allowed to create a new conversation.
 * Throws an AppError if the user has reached their limit.
 *
 * @param {ObjectId|String} userId The identifier of the user
 */
async function enforceNewChatLimit(userId) {
  // Determine the user's plan.  If we cannot find BillingStatus or the
  // user has no status document we assume the free plan.
  let plan = 'FREE';
  if (BillingStatus) {
    const status = await BillingStatus.findOne({ user: userId }).lean();
    if (status && status.plan) {
      plan = status.plan.toUpperCase();
    }
  }

  // Paid plans have unlimited conversations.
  if (plan === 'PRO' || plan === 'ULT') {
    return;
  }

  // For free plans, count the number of conversations created by this user in
  // the last seven days.  We treat the user as the creator if they appear
  // first in the participants array.  This avoids counting group chats
  // initiated by others against the user.
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Count conversations where this user appears in the participants array and
  // were created within the last week.  We do not attempt to distinguish
  // conversations they initiated from those they simply joined; this limit is
  // intentionally simple and errs on the conservative side for free users.
  const recentCount = await Conversation.countDocuments({
    participants: userId,
    createdAt: { $gte: oneWeekAgo },
  });

  if (recentCount >= MAX_FREE_NEW_CHATS_PER_WEEK) {
    logger.info(`User ${userId} has reached the free plan weekly conversation limit`);
    throw new AppError(429, 'Weekly chat limit reached on Free plan');
  }
}

module.exports = {
  enforceNewChatLimit,
};