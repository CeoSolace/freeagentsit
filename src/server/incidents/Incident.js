const mongoose = require('mongoose');

// Define a short-lived incident schema. We use a TTL index on createdAt
// to automatically purge old incidents after 24 hours. Resolved incidents
// are also removed immediately by the service layer.
const incidentSchema = new mongoose.Schema({
  refId: { type: String, required: true, unique: true },
  route: { type: String },
  userId: { type: String },
  severity: { type: String, default: 'info' },
  safeError: { type: mongoose.Schema.Types.Mixed },
  resolved: { type: Boolean, default: false },
  resolvedByUserId: { type: String },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 } // expire after 24h
});

module.exports = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);