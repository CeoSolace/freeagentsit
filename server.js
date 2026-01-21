// server.js - Enhanced, secure, runs bot via require
require('dotenv').config();
const express = require('express');
const next = require('next');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  server.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'style-src': ["'self'", "'unsafe-inline'"]
      }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));
  server.use(compression());
  server.use(cookieParser(process.env.COOKIE_SECRET || 'default_secret'));
  server.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  }));

  const csrfProtection = csurf({
    cookie: {
      httpOnly: true,
      secure: !dev,
      sameSite: 'strict'
    }
  });
  server.use(csrfProtection);

  server.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });

  // Stub for ads
  if (process.env.ADS_ENABLED === 'true') {
    server.use((req, res, next) => {
      // Ads logic
      next();
    });
  }

  server.all('*', (req, res) => handle(req, res));

  const port = process.env.PORT || 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Server ready on http://localhost:${port}`);
    // Run bot
    require('./bot.js');
  });
});
