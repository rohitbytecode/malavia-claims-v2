import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: "claim_mgmt_",
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 10],
});

export const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const httpActiveRequests = new client.Gauge({
  name: "http_requests_active",
  help: "Number of active HTTP requests currently being processed",
  labelNames: ["method", "route"],
});

export const httpRequestSizeBytes = new client.Histogram({
  name: "http_request_size_bytes",
  help: "Size of HTTP requests in bytes",
  labelNames: ["method", "route", "status_code"],
  buckets: [128, 512, 1024, 5120, 10240, 51200, 102400, 512000, 1024000],
});

export const httpResponseSizeBytes = new client.Histogram({
  name: "http_response_size_bytes",
  help: "Size of HTTP responses in bytes",
  labelNames: ["method", "route", "status_code"],
  buckets: [128, 512, 1024, 5120, 10240, 51200, 102400, 512000, 1024000, 5120000],
});

register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestCounter);
register.registerMetric(httpActiveRequests);
register.registerMetric(httpRequestSizeBytes);
register.registerMetric(httpResponseSizeBytes);

export { register };
