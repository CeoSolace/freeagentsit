/*
 * Socket.IO integration
 *
 * This module attaches a Socket.IO server to an existing HTTP server and
 * manages realtime messaging for conversations.  Each connected client must
 * emit a 'join' event with their conversation ID and user ID before sending
 * or receiving messages.  The server uses rooms (one per conversation) to
 * broadcast messages to all connected participants.  When the last user
 * disconnects from a room a grace timer is started; if no one rejoins
 * within the grace period the conversation and its messages are deleted.
 */

const { Server } = require('socket.io');
const chatService = require('../chat/chatService');
let logger;
try {
  logger = require('../common/logger');
} catch (err) {
  logger = {
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
}

// In‑memory map used to track active users per conversation.  When all
// participants leave a conversation we start a cleanup timer.  If any user
// rejoins before the timer fires we cancel the deletion.
const activeConversations = {};
const GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Initialise the Socket.IO server.
 *
 * @param {http.Server} server The existing HTTP server instance
 */
function initRealtime(server) {
  const io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    /**
     * Join a conversation room.  The payload must include conversationId and
     * userId.  The server will add the user to the active participants
     * tracking structure and emit the existing message history to the new
     * client.  Any pending cleanup timer for the conversation will be
     * cancelled.
     */
    socket.on('join', async (payload) => {
      try {
        const { conversationId, userId } = payload || {};
        if (!conversationId || !userId) {
          return;
        }
        socket.conversationId = conversationId;
        socket.userId = userId;
        // Join socket.io room
        socket.join(conversationId);
        // Cancel any pending deletion timer
        if (activeConversations[conversationId] && activeConversations[conversationId].timer) {
          clearTimeout(activeConversations[conversationId].timer);
          activeConversations[conversationId].timer = null;
        }
        // Track active user
        if (!activeConversations[conversationId]) {
          activeConversations[conversationId] = { participants: new Set(), timer: null };
        }
        activeConversations[conversationId].participants.add(userId.toString());
        // Let the service know the user joined (updates lastActiveAt)
        await chatService.joinConversation(conversationId, userId);
        // Send existing messages to the new client
        const messages = await chatService.getMessages(conversationId);
        socket.emit('history', messages);
      } catch (err) {
        logger.error('Error handling join', err);
      }
    });

    /**
     * Handle incoming chat messages.  The payload should include the
     * conversationId, userId and content.  The server persists the message
     * then broadcasts it to all clients in the room.
     */
    socket.on('message', async (payload) => {
      try {
        const { conversationId, userId, content } = payload || {};
        if (!conversationId || !userId || !content) {
          return;
        }
        const msg = await chatService.addMessage(conversationId, userId, content);
        io.to(conversationId).emit('message', msg);
      } catch (err) {
        logger.error('Error handling message', err);
      }
    });

    /**
     * Handle explicit leave event.  Clients should emit this before
     * disconnecting voluntarily.  It decrements the active participant count and
     * potentially starts the grace period timer.
     */
    socket.on('leave', async (payload) => {
      const conversationId = (payload && payload.conversationId) || socket.conversationId;
      const userId = (payload && payload.userId) || socket.userId;
      await handleDeparture(conversationId, userId);
    });

    /**
     * When a socket disconnects unexpectedly we treat it like a leave.  If
     * conversationId is known on the socket we call handleDeparture.
     */
    socket.on('disconnect', async () => {
      const conversationId = socket.conversationId;
      const userId = socket.userId;
      await handleDeparture(conversationId, userId);
    });

    /**
     * Internal helper to handle a user leaving a conversation.  If this was
     * the last participant the conversation is scheduled for deletion after
     * the grace period.
     */
    async function handleDeparture(conversationId, userId) {
      try {
        if (!conversationId || !userId) {
          return;
        }
        // Remove from active participants
        const record = activeConversations[conversationId];
        if (record && record.participants) {
          record.participants.delete(userId.toString());
          // If no one is left start the grace period timer
          if (record.participants.size === 0 && !record.timer) {
            record.timer = setTimeout(async () => {
              try {
                // Delete the conversation and its messages
                await chatService.deleteConversation(conversationId);
                delete activeConversations[conversationId];
              } catch (e) {
                logger.error('Failed to delete conversation after grace period', e);
              }
            }, GRACE_PERIOD_MS);
          }
        }
        // Update lastActiveAt
        await chatService.leaveConversation(conversationId, userId);
      } catch (err) {
        logger.error('Error handling departure', err);
      }
    }
  });
}

module.exports = initRealtime;