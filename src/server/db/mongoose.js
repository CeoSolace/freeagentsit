const mongoose = require('mongoose');
const { log, error: logError } = require('../../shared/logger');
const { getConfig } = require('../config');

let connection;

/**
 * Resolve MongoDB URI from all supported env keys.
 * Priority order is explicit and intentional.
 */
function resolveMongoUri(override) {
  return (
    override ||
    getConfig('MONGO_URI') ||
    getConfig('MONGO_URI') ||
    getConfig('MONGO_URI') ||
    process.env.MONGO_URI ||
    process.env.MONGO_URI ||
    process.env.MONGO_URI
  );
}

/**
 * Connect to MongoDB. Ensures only a single connection is established.
 *
 * @param {string} [uri] Optional override URI.
 * @returns {Promise<mongoose.Connection>}
 */
async function connectMongo(uri) {
  if (connection) {
    return connection;
  }

  const resolvedUri = resolveMongoUri(uri);

  if (!resolvedUri) {
    throw new Error(
      'MongoDB connection string not defined (expected MONGO_URI, MONGODB_URI, or DATABASE_URL)'
    );
  }

  try {
    await mongoose.connect(resolvedUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    connection = mongoose.connection;

    connection.on('error', (err) =>
      logError('MongoDB connection error:', err)
    );

    log('MongoDB connected');
    return connection;
  } catch (err) {
    logError('MongoDB connection failed:', err);
    throw err;
  }
}

/**
 * Get the existing MongoDB connection if available.
 *
 * @returns {mongoose.Connection|undefined}
 */
function getMongoConnection() {
  return connection;
}

module.exports = {
  connectMongo,
  getMongoConnection,
};

