import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("API health", () => {
  it("GET /api/health returns status payload", async () => {
    const app = createApp();
    const response = await request(app).get("/api/health");

    expect([200, 503, 500]).toContain(response.status);
    expect(response.body).toHaveProperty("status");
    expect(response.body).toHaveProperty("checks");
  });

  it("GET /api/metrics exposes prometheus metrics", async () => {
    const app = createApp();
    const response = await request(app).get("/api/metrics");

    expect(response.status).toBe(200);
    expect(response.text).toContain("http_requests_total");
  });
});
