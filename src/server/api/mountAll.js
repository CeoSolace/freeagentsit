// A unified router that mounts all of the API modules together.
//
// This file exists to avoid route collisions between multiple agents.  Instead
// of each feature defining its own top‑level API server, they can export
// routers which are then composed here.  To use this file, require it from
// your main server entry point (usually `src/server/api/index.js`) and pass
// in your Express app or use it as a standalone router.

const express = require('express');

// Import routers from each agent.  If an agent does not exist yet the
// require call will throw at runtime; that’s okay because the router will
// simply not mount it.  You can add additional modules here as new
// features are integrated.
let auth;
let billing;
let chat;
let reports;
try {
  auth = require('./auth');
} catch (e) {
  auth = null;
}
try {
  billing = require('./billing');
} catch (e) {
  billing = null;
}
try {
  chat = require('./chat');
} catch (e) {
  chat = null;
}
try {
  reports = require('./reports');
} catch (e) {
  reports = null;
}

/**
 * Creates and returns a router that mounts all API modules at their
 * respective paths.  You can optionally pass an existing Express app to
 * have the routes attached directly to it.
 *
 * @param {import('express').Express} [app] Optional Express application to mount on
 * @returns {import('express').Router} The composed router
 */
function mountAll(app) {
  const router = express.Router();

  if (auth) {
    router.use('/auth', auth);
  }
  if (billing) {
    router.use('/billing', billing);
  }
  if (chat) {
    router.use('/chat', chat);
  }
  if (reports) {
    router.use('/reports', reports);
  }

  // If an app was provided, mount the router directly on it at the root.
  if (app) {
    app.use('/', router);
  }

  return router;
}

module.exports = mountAll;