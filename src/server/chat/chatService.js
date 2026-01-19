/*
 * chatService
 *
 * Provides the core business logic for creating, joining and managing
 * conversations.  This layer abstracts away the database models and limit
 * enforcement and exposes a simple API that the HTTP routes and realtime
 * socket layer can call into.  It does not handle any direct response or
 * socket emission; that is left to the API route handlers and Socket.IO
 * configuration.
 */

const Conversation = require('../../../models/Conversation');
const Message = require('../../../models/Message');
let AppError;
let logger;
try {
  AppError = require('../common/errors').AppError;
} catch (err) {
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
const { enforceNewChatLimit } = require('./limitsService');

/**
 * Creates a new conversation between the current user and any additional
 * participants.  Free users are limited to a fixed number of new
 * conversations per rolling week.  All participants are included in the
 * conversation document's participants array.
 *
 * @param {String|ObjectId} creatorId The user initiating the conversation
 * @param {Array<String|ObjectId>} otherParticipantIds Additional user IDs to include
 * @returns {Promise<Conversation>} The created conversation
 */
async function createConversation(creatorId, otherParticipantIds = []) {
  if (!creatorId) {
    throw new AppError(400, 'CreatorId must be provided');
  }
  // Enforce plan-based limits before creating the conversation
  await enforceNewChatLimit(creatorId);
  const participants = [creatorId, ...new Set(otherParticipantIds)].map((id) => id.toString());
  const convo = await Conversation.create({ participants });
  logger.info(`Created conversation ${convo.id} by user ${creatorId}`);
  return convo;
}

/**
 * Adds a user to an existing conversation.  If the user is already a
 * participant the function simply returns the conversation.  Joining marks
 * the conversation as active.
 *
 * @param {String|ObjectId} conversationId The ID of the conversation to join
 * @param {String|ObjectId} userId The user joining
 */
async function joinConversation(conversationId, userId) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) {
    throw new AppError(404, 'Conversation not found');
  }
  const uid = userId.toString();
  if (!convo.participants.map((p) => p.toString()).includes(uid)) {
    convo.participants.push(userId);
  }
  // Saving will update lastActiveAt via pre-save hook
  await convo.save();
  return convo;
}

/**
 * Leaves a conversation.  This simply updates the lastActiveAt timestamp.  The
 * realtime layer will handle the actual deletion once all participants leave.
 *
 * @param {String|ObjectId} conversationId
 * @param {String|ObjectId} userId
 */
async function leaveConversation(conversationId, userId) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) {
    throw new AppError(404, 'Conversation not found');
  }
  // For now we do not remove users from the participants list when they leave;
  // this allows them to reconnect.  We simply update the lastActiveAt.
  await convo.save();
  return convo;
}

/**
 * Creates and persists a new message.
 *
 * @param {String|ObjectId} conversationId
 * @param {String|ObjectId} senderId
 * @param {String} content
 * @returns {Promise<Message>}
 */
async function addMessage(conversationId, senderId, content) {
  if (!content || !content.trim()) {
    throw new AppError(400, 'Message content cannot be empty');
  }
  const convo = await Conversation.findById(conversationId);
  if (!convo) {
    throw new AppError(404, 'Conversation not found');
  }
  const msg = await Message.create({ conversationId, sender: senderId, content: content.trim() });
  await convo.save(); // update lastActiveAt
  return msg;
}

/**
 * Returns all messages for a conversation in chronological order.
 *
 * @param {String|ObjectId} conversationId
 * @returns {Promise<Message[]>}
 */
async function getMessages(conversationId) {
  return Message.find({ conversationId }).sort({ createdAt: 1 }).lean();
}

/**
 * Permanently deletes a conversation and all of its messages.  Use this only
 * after ensuring that the conversation is truly finished (e.g. via the
 * realtime grace period).  This method does not check permissions.
 *
 * @param {String|ObjectId} conversationId
 */
async function deleteConversation(conversationId) {
  await Message.deleteMany({ conversationId });
  await Conversation.findByIdAndDelete(conversationId);
  logger.info(`Deleted conversation ${conversationId} and its messages`);
}

/**
 * Returns a list of conversations that include the given user.  Conversations
 * are ordered by most recent activity.  This is used for the inbox page.
 *
 * @param {String|ObjectId} userId
 */
async function listConversationsForUser(userId) {
  const convos = await Conversation.find({ participants: userId })
    .sort({ lastActiveAt: -1 })
    .lean();
  return convos;
}

module.exports = {
  createConversation,
  joinConversation,
  leaveConversation,
  addMessage,
  getMessages,
  deleteConversation,
  listConversationsForUser,
};