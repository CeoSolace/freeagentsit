const { uuidv4 } = require('../../shared/ids');
const { createIncident } = require('../incidents/incidentService');
const { error: logError } = require('../../shared/logger');

/**
 * Install a handler for uncaught exceptions. It logs the error and creates
 * an incident but deliberately does not terminate the process. Subsequent
 * uncaught exceptions will be logged but the process will stay alive.
 */
function handleUncaughtErrors() {
  process.on('uncaughtException', async (err) => {
    const refId = uuidv4();
    logError('Uncaught Exception:', err);
    try {
      await createIncident({
        refId,
        route: 'uncaughtException',
        userId: null,
        severity: 'critical',
        safeError: { name: err.name, message: err.message, stack: err.stack }
      });
    } catch (incidentErr) {
      logError('Failed to record incident for uncaught exception:', incidentErr);
    }
    // Do not call process.exit(); remain alive
  });
}

/**
 * Install a handler for unhandled promise rejections. It converts the
 * rejection reason into an Error if necessary, logs it and records an
 * incident. The process continues running.
 */
function handleUnhandledRejections() {
  process.on('unhandledRejection', async (reason) => {
    const err = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
    const refId = uuidv4();
    logError('Unhandled Rejection:', err);
    try {
      await createIncident({
        refId,
        route: 'unhandledRejection',
        userId: null,
        severity: 'critical',
        safeError: { name: err.name, message: err.message, stack: err.stack }
      });
    } catch (incidentErr) {
      logError('Failed to record incident for unhandled rejection:', incidentErr);
    }
  });
}

module.exports = {
  handleUncaughtErrors,
  handleUnhandledRejections
};