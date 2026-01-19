const express = require('express');
const router = express.Router();

/*
 * Central API router.  This file exposes a single Express Router which
 * mounts any sub‑routers that exist within this package.  If another
 * agent provides additional routers (e.g. billing or analytics), this
 * module will attempt to require them.  Missing modules are ignored
 * silently to allow multiple agents to merge without conflicts.
 */

// Helper to mount a subrouter if it exists.  If the module cannot be
// required because it does not exist, the error is swallowed.  Any
// other error (syntax error, etc.) will be re‑thrown to aid debugging.
function mountIfExists(pathPrefix, modulePath) {
  try {
    const subRouter = require(modulePath);
    if (subRouter && subRouter.stack) {
      router.use(pathPrefix, subRouter);
    }
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      // Log unexpected errors but don't crash the server
      try {
        const logger = require('../../shared/logger');
        if (logger && logger.error) logger.error('Error loading router', err);
      } catch (_) {
        // Fallback to console if logger is unavailable
        console.error('Error loading router', err);
      }
    }
  }
}

// Attempt to mount known subrouters from other agents.  These paths
// correspond to modules that may or may not exist depending on which
// agents are present.  Do not modify these names unless instructed.
const submodules = [
  ['/', './auth/routes'],
  ['/admin', './admin/routes'],
  ['/billing', './billing/routes'],
  ['/me', './me/routes'],
];
submodules.forEach(([prefix, mod]) => mountIfExists(prefix, mod));

module.exports = router;