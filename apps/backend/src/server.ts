import "./tracing.js";
import app from "./app.js";

import fs from "node:fs";
import path from "node:path";
import https from "node:https";

import { fileURLToPath } from "node:url";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase } from "./config/db.js";
import { initCronJobs } from "./jobs/cron.js";
import { initSocketServer } from "./config/socket.js";

import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startServer = async () => {
  await connectDatabase();

  // SSL Certificate Paths
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, "../cert/key.pem")),

    cert: fs.readFileSync(path.join(__dirname, "../cert/cert.pem")),
  };

  // Create HTTPS Server
  const httpsServer = https.createServer(sslOptions, app);

  // Initialize Socket.io on HTTPS server
  initSocketServer(httpsServer);

  const PORT = parseInt(env.PORT, 10);

  httpsServer.listen(PORT, "0.0.0.0", () => {
    logger.info(`HTTPS Server running on port ${PORT}`);
    initCronJobs();
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    httpsServer.close(async () => {
      logger.info("HTTPS server closed.");

      try {
        await mongoose.connection.close();

        logger.info("MongoDB connection closed.");

        process.exit(0);
      } catch (err) {
        logger.error(err, "Error during MongoDB disconnect:");

        process.exit(1);
      }
    });

    // Force shutdown after 10s
    setTimeout(() => {
      logger.error(
        "Could not close connections in time, forcefully shutting down"
      );

      process.exit(1);
    }, 10000);
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
};

startServer();
