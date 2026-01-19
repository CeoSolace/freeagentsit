/*
 * Chat API routes
 *
 * Exposes HTTP endpoints for creating conversations and joining or leaving
 * conversations.  These routes enforce per‑user limits via the limitsService
 * and delegate business logic to chatService.  They rely on upstream
 * authentication middleware to populate req.user.  If req.user is not set the
 * routes will respond with a 401 error.
 */

const express = require('express');
const router = express.Router();

const chatService = require('./chatService');
let AppError;
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

// Helper to extract the authenticated user's ID.  Throws if not authenticated.
function getUserId(req) {
  if (!req.user || !req.user.id) {
    throw new AppError(401, 'Authentication required');
  }
  return req.user.id;
}

// POST /api/chat/create
// Body: { participants: [<userId>, ...] }
router.post('/create', async (req, res, next) => {
  try {
    const creatorId = getUserId(req);
    const body = req.body || {};
    const others = Array.isArray(body.participants) ? body.participants : [];
    const convo = await chatService.createConversation(creatorId, others);
    return res.status(201).json({ conversationId: convo.id });
  } catch (err) {
    return next(err);
  }
});

// POST /api/chat/join
// Body: { conversationId }
router.post('/join', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.body || {};
    if (!conversationId) {
      throw new AppError(400, 'conversationId is required');
    }
    const convo = await chatService.joinConversation(conversationId, userId);
    return res.json({ conversationId: convo.id });
  } catch (err) {
    return next(err);
  }
});

// POST /api/chat/leave
// Body: { conversationId }
router.post('/leave', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.body || {};
    if (!conversationId) {
      throw new AppError(400, 'conversationId is required');
    }
    await chatService.leaveConversation(conversationId, userId);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

// GET /api/chat/list
// Returns the list of conversations for the authenticated user
router.get('/list', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const convos = await chatService.listConversationsForUser(userId);
    return res.json({ conversations: convos });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;