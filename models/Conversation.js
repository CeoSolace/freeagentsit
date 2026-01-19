/*
 * Conversation model
 *
 * This model stores high level information about a chat between one or more users.  A
 * conversation is considered "active" while at least one user is connected via the
 * realtime Socket.IO connection.  Once all participants disconnect the server will
 * start a grace period timer; if no one reconnects before the timer expires the
 * conversation and its associated messages will be deleted.  Conversations are
 * removed entirely from the database after this timer expires to ensure there is
 * no lingering history.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ConversationSchema = new Schema(
  {
    // Array of user identifiers participating in the conversation.  We store
    // identifiers as strings to remain agnostic of any particular User model.
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      index: true,
    },
    // When the conversation was created.  Used for limit enforcement on free
    // plans and for metadata in exported reports.
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    // Timestamp of the last activity (join, leave or message).  This helps the
    // realtime layer decide when to clean up old conversations that are no
    // longer active.
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'conversations',
  },
);

// We do not store messages inside the conversation document to keep the data
// lean; messages live in their own collection with a TTL index.  If this
// behaviour changes in the future the conversation schema can be extended.

// Whenever a conversation document is saved we update lastActiveAt.  This
// ensures that creating a new message or joining/leaving the room will bump
// the timestamp so the grace period always starts after the last activity.
ConversationSchema.pre('save', function (next) {
  this.lastActiveAt = new Date();
  next();
});

module.exports = mongoose.model('Conversation', ConversationSchema);