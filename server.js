const express = require("express");
const http = require("http");
const next = require("next");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

// Load environment variables from .env if present
dotenv.config();

const { connectMongo } = require("./src/server/db/mongoose");
const { log, warn, error: logError } = require("./src/shared/logger");
const errorMiddleware = require("./src/server/errors/errorMiddleware");
const { handleUncaughtErrors, handleUnhandledRejections } = require("./src/server/errors/processHandlers");
const { createIncident } = require("./src/server/incidents/incidentService");
const { uuidv4 } = require("./src/shared/ids");

// Determine environment
const port = Number(process.env.PORT) || 3006;
const dev = process.env.NODE_ENV !== "production";

async function bootstrap() {
  // Register process-level handlers early (don’t crash the whole app)
  handleUncaughtErrors();
  handleUnhandledRejections();

  // Connect to MongoDB once at startup
  try {
    await connectMongo();
    log("MongoDB connection established");
  } catch (err) {
    logError("Failed to connect to MongoDB:", err);
    // Continue startup even if DB connection fails; app can still serve pages + show errors
  }

  // Prepare Next.js app
  const nextApp = next({ dev });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const app = express();

  // Trust the first proxy (Render/Heroku style)
  app.set("trust proxy", 1);

  // Security and parsing middlewares
  app.use(helmet());
  app.use(cookieParser());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

  // Load API router if present; otherwise stub with 503
  let apiRouter;
  try {
    apiRouter = require("./src/server/api/index");
  } catch (err) {
    warn("API router not found, mounting stub that returns 503");
    apiRouter = express.Router().all("*", (req, res) => {
      res.status(503).json({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Service Unavailable" } });
    });
  }
  app.use("/api", apiRouter);

  // Create HTTP server to attach Socket.IO and Next handler on
  const server = http.createServer(app);

  // Attach Socket.IO if module exists
  try {
    const socketModule = require("./src/server/realtime/socket");
    if (socketModule && typeof socketModule.initSocket === "function") {
      socketModule.initSocket(server);
      log("Socket.IO initialized");
    } else {
      warn("Socket module loaded but initSocket() not found");
    }
  } catch (err) {
    warn("Socket.IO module not found, skipping socket setup");
  }

  // Start Discord bot (NOTE: bot is at ./bot, not ./src/bot)
  try {
    const { startBot } = require("./bot/index");

    if (typeof startBot !== "function") {
      warn("Bot module loaded but startBot() not exported");
    } else {
      const services = {
        createIncident,
        // Add more injected services as your modules mature (banService, billing, etc.)
      };

      const client = await startBot({ services });
      if (client) log("Discord bot online");
      else warn("Discord bot not started (missing token/config)");
    }
  } catch (err) {
    warn(`Bot module not found or failed to start: ${err.message}`);
  }

  // Next.js page handler. Wrap in catch to forward errors to middleware.
  app.all("*", (req, res) => {
    Promise.resolve(handle(req, res)).catch((err) => {
      errorMiddleware(err, req, res, () => {});
    });
  });

  // Error handling middleware should be last
  app.use(errorMiddleware);

  // Start listening
  server.listen(port, () => {
    log(`Server ready on port ${port}`);
  });

  // Graceful shutdown on SIGTERM/SIGINT
  const gracefulShutdown = () => {
    log("Received termination signal, shutting down gracefully");
    server.close(() => {
      log("HTTP server closed");
    });

    try {
      const mongoose = require("mongoose");
      if (mongoose.connection && mongoose.connection.readyState) {
        mongoose.connection.close(false).then(() => log("MongoDB connection closed"));
      }
    } catch {
      // ignore
    }
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

bootstrap().catch(async (err) => {
  // Create an incident on startup failure
  const refId = uuidv4();
  logError("Startup error:", err);

  try {
    await createIncident({
      refId,
      route: "startup",
      userId: null,
      severity: "critical",
      safeError: { name: err.name, message: err.message, stack: err.stack },
    });
  } catch (incidentErr) {
    logError("Failed to record incident for startup error:", incidentErr);
  }
});
