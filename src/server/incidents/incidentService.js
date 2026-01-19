const Incident = require('./Incident');
const { log, error: logError } = require('../../shared/logger');

/**
 * Create a new incident record. Used whenever an error occurs. If the
 * database is unavailable, logs to the console but does not throw.
 *
 * @param {Object} options Incident details
 * @param {string} options.refId Unique reference identifier
 * @param {string} options.route Route or context where the error occurred
 * @param {string|null} options.userId Optional user identifier
 * @param {string} options.severity Severity level (info|warning|critical)
 * @param {Object} options.safeError Sanitised error object
 * @returns {Promise<Incident|null>} The created incident or null if failed
 */
async function createIncident({ refId, route, userId, severity, safeError }) {
  try {
    const incident = new Incident({ refId, route, userId, severity, safeError });
    await incident.save();
    log('Incident recorded', refId);
    return incident;
  } catch (err) {
    // Logging DB errors shouldn't crash the application
    logError('Failed to save incident:', err);
    return null;
  }
}

/**
 * Mark an incident as resolved and immediately remove it from the collection.
 *
 * @param {string} incidentId The MongoDB _id of the incident
 * @param {string|null} resolvedByUserId Optional user ID who resolved
 * @returns {Promise<Incident|null>} The resolved incident or null if not found
 */
async function resolveIncident(incidentId, resolvedByUserId) {
  try {
    const incident = await Incident.findById(incidentId);
    if (!incident) return null;
    incident.resolved = true;
    incident.resolvedByUserId = resolvedByUserId;
    incident.resolvedAt = new Date();
    await incident.save();
    // Remove resolved incidents immediately
    await Incident.deleteOne({ _id: incidentId });
    log('Incident resolved and removed', incidentId);
    return incident;
  } catch (err) {
    logError('Failed to resolve incident:', err);
    return null;
  }
}

/**
 * List all unresolved incidents. Used by admin tools. Returns lean objects.
 *
 * @returns {Promise<Array>} Array of unresolved incidents
 */
async function listOpenIncidents() {
  try {
    return await Incident.find({ resolved: false }).lean().exec();
  } catch (err) {
    logError('Failed to list incidents:', err);
    return [];
  }
}

/**
 * Remove all incidents marked as resolved. Useful for periodic cleanup.
 *
 * @returns {Promise<number>} The number of removed documents
 */
async function cleanupResolvedIncidents() {
  try {
    const result = await Incident.deleteMany({ resolved: true });
    return result.deletedCount;
  } catch (err) {
    logError('Failed to cleanup incidents:', err);
    return 0;
  }
}

module.exports = {
  createIncident,
  resolveIncident,
  listOpenIncidents,
  cleanupResolvedIncidents
};