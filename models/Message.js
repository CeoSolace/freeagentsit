/*
 * Message model
 *
 * Individual chat messages are stored in their own collection.  Each message
 * references a conversation and a sender.  A TTL index ensures that messages
 * automatically expire after a reasonable period even if the conversation is
 * never explicitly cleaned up by the realtime layer.  This TTL is a backstop
 * rather than a primary means of deletion; the realtime layer will actively
 * remove messages when a conversation ends.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 60 * 60 * 24, // messages expire after 24 hours as a safety net
    },
  },
  {
    collection: 'messages',
  },
);

module.exports = mongoose.model('Message', MessageSchema);