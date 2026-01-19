const mongoose = require("mongoose");

const BillingStatusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true,
    },

    // FREE | PRO | ULT
    plan: {
      type: String,
      enum: ["FREE", "PRO", "ULT"],
      default: "FREE",
      index: true,
    },

    // Stripe linkage (used by billing/webhooks)
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String, index: true },

    // Optional subscription timing
    since: { type: Date, default: Date.now },
    until: { type: Date, default: null },

    // Weekly chat limit tracking
    chatsWeekStart: { type: Date, default: null },
    chatsStartedThisWeek: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Helpful index for expiry queries (optional)
BillingStatusSchema.index({ until: 1 });

module.exports =
  mongoose.models.BillingStatus ||
  mongoose.model("BillingStatus", BillingStatusSchema);
