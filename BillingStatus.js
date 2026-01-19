const mongoose = require("mongoose");

/**
 * BillingStatus
 *
 * Tracks a user's current subscription plan, Stripe linkage,
 * and weekly usage limits (e.g. chat limits).
 *
 * This model is REQUIRED for:
 * - plan enforcement (FREE / PRO / ULT)
 * - Stripe webhook reconciliation
 * - weekly chat limits
 */
const BillingStatusSchema = new mongoose.Schema(
  {
    // Owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Subscription tier
    plan: {
      type: String,
      enum: ["FREE", "PRO", "ULT"],
      default: "FREE",
      index: true,
    },

    // Stripe identifiers (optional but expected by billing)
    stripeCustomerId: {
      type: String,
      index: true,
    },

    stripeSubscriptionId: {
      type: String,
      index: true,
    },

    // Subscription timing
    since: {
      type: Date,
      default: Date.now,
    },

    until: {
      type: Date,
      default: null, // null = active / lifetime
      index: true,
    },

    // Weekly chat limit tracking
    chatsWeekStart: {
      type: Date,
      default: null,
    },

    chatsStartedThisWeek: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Instance helpers
 */
BillingStatusSchema.methods.isActive = function () {
  if (!this.until) return true;
  return new Date() < new Date(this.until);
};

BillingStatusSchema.methods.isProOrHigher = function () {
  return this.plan === "PRO" || this.plan === "ULT";
};

BillingStatusSchema.methods.hasUnlimitedChats = function () {
  return this.plan === "PRO" || this.plan === "ULT";
};

/**
 * Static helpers
 */
BillingStatusSchema.statics.ensureForUser = async function (userId) {
  let status = await this.findOne({ userId });
  if (!status) {
    status = await this.create({ userId, plan: "FREE" });
  }
  return status;
};

/**
 * Indexes
 */
BillingStatusSchema.index({ userId: 1, plan: 1 });
BillingStatusSchema.index({ stripeSubscriptionId: 1 });

module.exports =
  mongoose.models.BillingStatus ||
  mongoose.model("BillingStatus", BillingStatusSchema);
