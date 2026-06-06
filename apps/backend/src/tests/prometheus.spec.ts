import request from "supertest";
import app from "@/app.js";
import { register } from "@/config/prometheus.js";

describe("Prometheus Metrics Integration", () => {
  beforeEach(() => {
    // Clear registry metrics before each test to have clean state
    register.clear();
  });

  it("should expose the /metrics endpoint and return valid Prometheus formats", async () => {
    const response = await request(app).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain(register.contentType);
    expect(response.text).toContain("claim_mgmt_");
    expect(response.text).toContain("http_requests_total");
    expect(response.text).toContain("http_request_duration_seconds");
    expect(response.text).toContain("http_requests_active");
  });

  it("should track HTTP request metrics when hitting endpoints", async () => {
    // Make a request to the health endpoint
    const healthResponse = await request(app).get("/health");
    expect(healthResponse.status).toBe(200);

    // Fetch metrics to verify tracking
    const metricsResponse = await request(app).get("/metrics");
    expect(metricsResponse.status).toBe(200);

    // Verify health endpoint route is registered in the metrics output
    expect(metricsResponse.text).toContain('route="/health"');
    expect(metricsResponse.text).toContain('method="GET"');
    expect(metricsResponse.text).toContain('status_code="200"');
    expect(metricsResponse.text).toContain("http_requests_total");
    expect(metricsResponse.text).toContain("http_request_duration_seconds");
  });

  it("should handle 404 endpoint routing correctly in metrics", async () => {
    // Make a request to a non-existent endpoint
    await request(app).get("/api/v1/invalid-route-xyz");

    // Fetch metrics
    const metricsResponse = await request(app).get("/metrics");
    expect(metricsResponse.status).toBe(200);

    // Verify 404 route is registered in the metrics output
    expect(metricsResponse.text).toContain('route="404"');
    expect(metricsResponse.text).toContain('status_code="404"');
  });
});
