import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import type { Request, Response } from "express";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

import { errorMiddleware } from "./middleware/error.middleware.js";
import {
  setupSecurityMiddleware,
  apiLimiter,
} from "./middleware/security.middleware.js";

import authRouter from "./modules/auth/index.js";
import usersRouter from "./modules/users/index.js";
import insuranceCompanyRouter from "./modules/insurance-companies/index.js";
import departmentRouter from "./modules/departments/index.js";
import communicationsRouter from "./modules/communications/index.js";
import documentsRouter from "./modules/documents/index.js";
import claimsRouter from "./modules/claims/index.js";
import settlementsRouter from "./modules/settlements/index.js";
import allocationsRouter from "./modules/department-allocations/index.js";
import depositsRouter from "./modules/deposits/index.js";
import alertsRouter from "./modules/alerts/index.js";
import dashboardRouter from "./modules/dashboard/index.js";
import auditLogsRouter from "./modules/audit-logs/index.js";
import reportsRouter from "./modules/reports/index.js";
import timelinesRouter from "./modules/timelines/index.js";
import notificationsRouter from "./modules/notifications/index.js";

import { setupSwagger } from "./config/swagger.js";

const app = express();

import pinoHttpImport from "pino-http";

const pinoHttp =
  typeof pinoHttpImport === "function"
    ? pinoHttpImport
    : pinoHttpImport.default;

setupSecurityMiddleware(app);

app.use(
  pinoHttp({
    logger,

    genReqId: (req: Request, res: Response) => {
      const existingId = req.headers["x-request-id"];

      if (typeof existingId === "string" && existingId.length > 0) {
        return existingId;
      }

      const reqId = randomUUID();

      res.setHeader("x-request-id", reqId);

      return reqId;
    },

    customSuccessMessage: (req: Request, res: Response) => {
      return `${req.method} ${req.url} completed`;
    },

    customErrorMessage: (req: Request, res: Response, error: Error) => {
      return `${req.method} ${req.url} failed`;
    },

    customProps: () => {
      return {
        service: "claim-management-api",
        environment: env.NODE_ENV,
      };
    },

    serializers: {
      req(req: Request & { id?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        };
      },

      res(res: Response) {
        return {
          statusCode: res.statusCode,
        };
      },
    },

    autoLogging: {
      ignore: (req: Request) => {
        return req.url === "/live" || req.url === "/ready";
      },
    },
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use("/api", apiLimiter);

setupSwagger(app);

app.get("/health", (_, res) => {
  res.status(200).json({
    success: true,
    message: "Claim Management API Running",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/live", (_, res) => {
  res.status(200).send("OK");
});

app.get("/ready", (_, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(200).send("Ready");
  }

  return res.status(503).send("Database not connected");
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/insurance-companies", insuranceCompanyRouter);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/communications", communicationsRouter);
app.use("/api/v1/documents", documentsRouter);
app.use("/api/v1/claims", claimsRouter);
app.use("/api/v1/settlements", settlementsRouter);
app.use("/api/v1/department-allocations", allocationsRouter);
app.use("/api/v1/deposits", depositsRouter);
app.use("/api/v1/alerts", alertsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/audit-logs", auditLogsRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/timelines", timelinesRouter);
app.use("/api/v1/notifications", notificationsRouter);

app.use(errorMiddleware);

export default app;
