/*
 * reportService
 *
 * Handles creation and retrieval of user reports.  When a report is
 * submitted the relevant conversation is exported into a standalone HTML
 * document which is persisted with the report.  Staff members can later
 * retrieve reports via the listReports and getReport functions.  This
 * service does not perform authentication or authorisation checks; those
 * responsibilities reside in the API routes.
 */

const Report = require('../../../models/Report');
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
const { buildConversationHtml } = require('./exportHtml');

/**
 * Creates a new report for the given conversation on behalf of the reporter.
 * The conversation must exist and the reporter must be a participant.  The
 * conversation's messages are exported to HTML which is stored on the report.
 *
 * @param {String|ObjectId} conversationId
 * @param {String|ObjectId} reporterId
 * @param {String} reason
 * @returns {Promise<Report>} The saved report document
 */
async function submitReport(conversationId, reporterId, reason = '') {
  // Load conversation and verify reporter is a participant
  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }
  const reporterStr = reporterId.toString();
  const isParticipant = conversation.participants.some((p) => p.toString() === reporterStr);
  if (!isParticipant) {
    throw new AppError(403, 'You are not a participant of this conversation');
  }
  // Export messages
  const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).lean();
  const html = buildConversationHtml(conversation, messages, [], { reportReason: reason });
  const report = await Report.create({
    conversation: conversationId,
    reporter: reporterId,
    reason,
    exportedHtml: html,
  });
  logger.info(`Report ${report.id} created for conversation ${conversationId} by ${reporterId}`);
  return report;
}

/**
 * Returns an array of reports.  Optionally filters by reporter.  Reports are
 * ordered by most recent first.
 *
 * @param {String|ObjectId} [reporterId]
 */
async function listReports(reporterId) {
  const query = {};
  if (reporterId) {
    query.reporter = reporterId;
  }
  return Report.find(query).sort({ createdAt: -1 }).lean();
}

/**
 * Retrieves a single report by its ID.  Throws if not found.
 *
 * @param {String|ObjectId} reportId
 */
async function getReport(reportId) {
  const report = await Report.findById(reportId).lean();
  if (!report) {
    throw new AppError(404, 'Report not found');
  }
  return report;
}

module.exports = {
  submitReport,
  listReports,
  getReport,
};