import type { Request, Response, NextFunction } from "express";
import {
  httpRequestDurationSeconds,
  httpRequestCounter,
  httpActiveRequests,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
} from "../config/prometheus.js";

export const prometheusMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = process.hrtime();
  const method = req.method;

  let responseSize = 0;
  const originalWrite = res.write;
  const originalEnd = res.end;

  res.write = function (chunk: any, encoding?: any, callback?: any) {
    if (chunk) {
      if (Buffer.isBuffer(chunk)) {
        responseSize += chunk.length;
      } else if (typeof chunk === "string") {
        responseSize += Buffer.byteLength(chunk, encoding || "utf8");
      } else if (chunk.length) {
        responseSize += chunk.length;
      }
    }
    return originalWrite.apply(res, arguments as any);
  };

  res.end = function (chunk: any, encoding?: any, callback?: any) {
    if (chunk) {
      if (Buffer.isBuffer(chunk)) {
        responseSize += chunk.length;
      } else if (typeof chunk === "string") {
        responseSize += Buffer.byteLength(chunk, encoding || "utf8");
      } else if (chunk.length) {
        responseSize += chunk.length;
      }
    }
    return originalEnd.apply(res, arguments as any);
  };

  const path = req.path || "/";
  let fallbackRoute = ["/metrics", "/health", "/live", "/ready"].includes(path)
    ? path
    : path
        .replace(/\/[0-9a-fA-F]{24}(\b|\/)/g, "/:id$1")
        .replace(
          /\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(\b|\/)/g,
          "/:id$1"
        )
        .replace(/\/\d+(\b|\/)/g, "/:id$1");

  if (fallbackRoute.length > 1 && fallbackRoute.endsWith("/")) {
    fallbackRoute = fallbackRoute.slice(0, -1);
  }

  httpActiveRequests.inc({ method, route: fallbackRoute });

  let recorded = false;
  const recordMetrics = () => {
    if (recorded) return;
    recorded = true;

    httpActiveRequests.dec({ method, route: fallbackRoute });

    let route = req.route
      ? `${req.baseUrl || ""}${Array.isArray(req.route.path) ? req.route.path.join("|") : req.route.path}`
      : "";

    if (!route) {
      if (res.statusCode === 404) {
        route = "404";
      } else {
        route = fallbackRoute;
      }
    }

    if (route.length > 1 && route.endsWith("/")) {
      route = route.slice(0, -1);
    }

    const statusCode = res.statusCode.toString();

    // Duration in seconds
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;

    // Record metrics
    httpRequestDurationSeconds.observe(
      { method, route, status_code: statusCode },
      duration
    );
    httpRequestCounter.inc({ method, route, status_code: statusCode });

    // Request size
    const requestSize = parseInt(req.headers["content-length"] || "0", 10);
    httpRequestSizeBytes.observe(
      { method, route, status_code: statusCode },
      requestSize
    );

    // Response size
    httpResponseSizeBytes.observe(
      { method, route, status_code: statusCode },
      responseSize
    );
  };

  res.on("finish", recordMetrics);
  res.on("close", recordMetrics);

  next();
};
