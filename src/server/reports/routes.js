/*
 * Report API routes
 *
 * These endpoints allow users to submit reports against conversations and
 * provide staff members with the ability to view submitted reports.  When a
 * report is submitted the conversation is exported to a sanitised HTML
 * document and stored on the report.  Staff can then download the exported
 * conversation via the export endpoint without touching any live chat data.
 */

const express = require('express');
const router = express.Router();

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
const reportService = require('./reportService');
const chatService = require('../chat/chatService');
const { buildConversationHtml } = require('./exportHtml');

// Helper to get auth user; similar to chat routes
function getUserId(req) {
  if (!req.user || !req.user.id) {
    throw new AppError(401, 'Authentication required');
  }
  return req.user.id;
}

// POST /api/reports/submit
// Body: { conversationId, reason }
router.post('/submit', async (req, res, next) => {
  try {
    const reporterId = getUserId(req);
    const { conversationId, reason } = req.body || {};
    if (!conversationId) {
      throw new AppError(400, 'conversationId is required');
    }
    const report = await reportService.submitReport(conversationId, reporterId, reason || '');
    return res.status(201).json({ reportId: report.id });
  } catch (err) {
    return next(err);
  }
});

// GET /api/reports/export?conversationId=...
// Allows a participant to export a conversation to HTML without filing a report.
router.get('/export', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.query;
    if (!conversationId) {
      throw new AppError(400, 'conversationId is required');
    }
    // Verify user is part of conversation
    const conversation = await chatService.joinConversation(conversationId, userId);
    const messages = await chatService.getMessages(conversationId);
    const html = buildConversationHtml(conversation, messages, [], {});
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.html"`);
    return res.send(html);
  } catch (err) {
    return next(err);
  }
});

// GET /api/reports
// Staff: list all reports
router.get('/', async (req, res, next) => {
  try {
    // Only staff can list reports
    if (!req.user || !req.user.isStaff) {
      throw new AppError(403, 'Forbidden');
    }
    const reports = await reportService.listReports();
    return res.json({ reports });
  } catch (err) {
    return next(err);
  }
});

// GET /api/reports/:id
// Staff: fetch a single report
router.get('/:id', async (req, res, next) => {
  try {
    if (!req.user || !req.user.isStaff) {
      throw new AppError(403, 'Forbidden');
    }
    const report = await reportService.getReport(req.params.id);
    return res.json({ report });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;