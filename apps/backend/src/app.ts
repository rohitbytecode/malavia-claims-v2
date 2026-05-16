import express from "express";
import cors from "cors";

import { errorMiddleware } from "./middleware/error.middleware.js";
import { setupSecurityMiddleware, apiLimiter } from "./middleware/security.middleware.js";
import { requestLogger } from "./middleware/logger.middleware.js";
import { env } from "./config/env.js";
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

app.use(requestLogger);

setupSecurityMiddleware(app);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));

// Apply rate limiter to all API routes
app.use("/api", apiLimiter);

setupSwagger(app);

import mongoose from "mongoose";

app.get("/health", (_, res) => {
  res.status(200).json({
    success: true,
    message: "Claim Management API Running",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get("/live", (_, res) => {
  res.status(200).send("OK");
});

app.get("/ready", (_, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).send("Ready");
  } else {
    res.status(503).send("Database not connected");
  }
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
