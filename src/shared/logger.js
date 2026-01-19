/**
 * Simple logger abstraction. In a real system this could be replaced by
 * Winston, Pino or another structured logging solution. For now we
 * delegate to the console.
 */
function log(...args) {
  console.log('[INFO]', ...args);
}

function warn(...args) {
  console.warn('[WARN]', ...args);
}

function error(...args) {
  console.error('[ERROR]', ...args);
}

module.exports = { log, warn, error };