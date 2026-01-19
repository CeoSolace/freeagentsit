/*
 * Export HTML utility
 *
 * Builds a self‑contained, sanitised HTML document for a conversation.  The
 * generated markup includes a header summarising the participants, start and
 * end times and the optional report reason.  Each message appears on its own
 * line with its timestamp and sender.  No external resources are referenced,
 * making the output safe to view offline.  All message content is HTML
 * escaped to prevent injection of scripts or markup.
 */

const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Generates an HTML export of a conversation.
 *
 * @param {Object} conversation Mongoose conversation document (lean object)
 * @param {Array<Object>} messages Array of message documents (lean objects)
 * @param {Array<String>} participantNames Names or identifiers of the participants
 * @param {Object} opts Optional settings; may include a reportReason
 * @returns {String} Standalone HTML document as a string
 */
function buildConversationHtml(conversation, messages, participantNames = [], opts = {}) {
  const { reportReason } = opts;
  const createdAt = new Date(conversation.createdAt);
  const lastMessageAt = messages.length
    ? new Date(messages[messages.length - 1].createdAt)
    : new Date(conversation.lastActiveAt || createdAt);
  const participants = participantNames.length ? participantNames.join(', ') : conversation.participants.join(', ');
  let html = '';
  html += '<!DOCTYPE html>';
  html += '<html lang="en">';
  html += '<head>';
  html += '<meta charset="UTF-8">';
  html += '<meta http-equiv="X-UA-Compatible" content="IE=edge">';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
  html += `<title>Chat Export – ${escapeHtml(participants)}</title>`;
  // Inline CSS for readability
  html += '<style>';
  html += 'body{font-family:Arial,Helvetica,sans-serif;background:#f8f9fa;padding:20px;color:#212529;}';
  html += '.header{margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #dee2e6;}';
  html += '.header h1{margin:0;font-size:20px;}';
  html += '.header .meta{font-size:12px;color:#6c757d;margin-top:4px;}';
  html += '.messages{background:#ffffff;border:1px solid #dee2e6;border-radius:4px;padding:15px;max-height:80vh;overflow-y:auto;}';
  html += '.message{margin-bottom:10px;}';
  html += '.message .meta{font-size:12px;color:#6c757d;margin-bottom:2px;}';
  html += '.message .content{font-size:14px;white-space:pre-wrap;}';
  html += '</style>';
  html += '</head>';
  html += '<body>';
  html += '<div class="header">';
  html += `<h1>Conversation Export</h1>`;
  html += `<div class="meta"><strong>Participants:</strong> ${escapeHtml(participants)}</div>`;
  html += `<div class="meta"><strong>Started:</strong> ${createdAt.toISOString()}</div>`;
  html += `<div class="meta"><strong>Ended:</strong> ${lastMessageAt.toISOString()}</div>`;
  if (reportReason) {
    html += `<div class="meta"><strong>Report reason:</strong> ${escapeHtml(reportReason)}</div>`;
  }
  html += '</div>';
  html += '<div class="messages">';
  messages.forEach((msg) => {
    const time = new Date(msg.createdAt).toISOString();
    html += '<div class="message">';
    html += `<div class="meta"><strong>${escapeHtml(msg.sender.toString())}</strong> at ${time}</div>`;
    html += `<div class="content">${escapeHtml(msg.content)}</div>`;
    html += '</div>';
  });
  html += '</div>';
  html += '</body>';
  html += '</html>';
  return html;
}

module.exports = {
  buildConversationHtml,
};