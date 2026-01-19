// Mongoose model for Boost purchases.
//
// A Boost represents a paid promotion on one of several entity types
// (player, team, listing or creator).  Each record stores the user
// who purchased the boost, the targeted entity, the duration and
// the calculated expiry (boostedUntil).  When multiple boosts are
// purchased they stack by extending the boostedUntil date into the
// future.  A createdAt timestamp is included for auditing.

'use strict';

const mongoose = require('mongoose');

const BoostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['player', 'team', 'listing', 'creator'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    duration: {
      type: String,
      enum: ['24h', '72h', '7d'],
      required: true,
    },
    boostedUntil: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    collection: 'boosts',
  }
);

// Compound index to efficiently query boosts by user and target.  The
// boostedUntil field is included to allow range queries when
// determining whether a boost is still active or when stacking
// durations.
BoostSchema.index({ user: 1, targetType: 1, targetId: 1, boostedUntil: -1 });

// Index boostedUntil separately to support TTL or expiry checks if
// desired.  This does not automatically expire documents but can be
// useful for queries.
BoostSchema.index({ boostedUntil: 1 });

module.exports = mongoose.models.Boost || mongoose.model('Boost', BoostSchema);