/*
 * AuditLog collects all significant changes to the system for later
 * inspection.  Each entry records the user responsible, the action
 * taken and any relevant details.  Entries are stored in memory
 * within the process lifetime.  In production these should be
 * persisted to a database or logging service.
 */

const logs = [];

class AuditLogEntry {
  constructor(user, action, details) {
    this.id = logs.length + 1;
    this.userId = user ? user.id : null;
    this.action = action;
    this.details = details || {};
    this.timestamp = new Date();
  }
}

class AuditLog {
  static log(user, action, details) {
    const entry = new AuditLogEntry(user, action, details);
    logs.push(entry);
    // Attempt to log externally if a shared logger is available
    try {
      const logger = require('../src/shared/logger');
      if (logger && logger.info) {
        logger.info('Audit', { action, userId: entry.userId, details });
      }
    } catch (_) {
      // no‑op if logger is missing
    }
    return entry;
  }

  static all() {
    return logs.slice();
  }
}

module.exports = { AuditLog, AuditLogEntry };