const AppError = require('./error');
const { log, warn, error: logError } = require('../../shared/logger');
const { createIncident } = require('../incidents/incidentService');
const { uuidv4 } = require('../../shared/ids');
const renderOops = require('./renderOopsPage');

/**
 * Express error-handling middleware. Converts thrown errors into a standard response
 * and triggers incident creation. Should be mounted after all other routes.
 *
 * @param {Error} err The error thrown
 * @param {import('express').Request} req Express request
 * @param {import('express').Response} res Express response
 * @param {import('express').NextFunction} next Express next callback
 */
function errorMiddleware(err, req, res, next) {
  // Some frameworks may call error handlers without an error
  if (!err) return next();
  const refId = uuidv4();
  const status = err instanceof AppError ? err.status : (err.status || 500);
  const safeError = {
    name: err.name,
    message: err.message,
    stack: err.stack
  };
  // Fire and forget incident logging
  createIncident({
    refId,
    route: req.originalUrl || req.url || 'unknown',
    userId: (req.user && req.user.id) || null,
    severity: status >= 500 ? 'critical' : 'warning',
    safeError
  }).catch((incidentErr) => {
    logError('Failed to record incident:', incidentErr);
  });
  // Log locally
  logError(err);
  // Format response depending on Accept header
  const messageLines = [
    'oops, we have had a error',
    'it has been alerted to the right authority',
    'check back later or check our discord server'
  ];
  const payload = { refId, message: messageLines.join('\n') };
  if (req.accepts(['html']) && !req.xhr) {
    // Render plain HTML page
    renderOops(res, refId);
  } else {
    res.status(status).json(payload);
  }
}

module.exports = errorMiddleware;