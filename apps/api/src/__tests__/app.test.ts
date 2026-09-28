import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// The full app pulls in every route -> controller -> service -> prisma
// chain, so we mock prisma at the root so nothing tries to hit a real DB.
vi.mock("../config/database", () => ({
  prisma: new Proxy(
    {},
    {
      get: () => new Proxy(() => Promise.resolve(null), { get: () => vi.fn() }),
    }
  ),
}));

import { createApp } from "../app";

describe("createApp — end-to-end wiring", () => {
  it("responds to the health check without auth or rate limiting", async () => {
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns a consistent 404 envelope for unknown routes", async () => {
    const app = createApp();
    const res = await request(app).get("/api/this-route-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/route not found/i);
  });

  it("rejects protected routes without a token", async () => {
    const app = createApp();
    const res = await request(app).get("/api/users/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("allows CORS from the configured FRONTEND_URL", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/health")
      .set("Origin", process.env.FRONTEND_URL as string);

    expect(res.headers["access-control-allow-origin"]).toBe(process.env.FRONTEND_URL);
  });

  it("never reflects an arbitrary request Origin back — only the configured FRONTEND_URL", async () => {
    // With a static `origin` string, the `cors` package always returns that
    // configured value as Access-Control-Allow-Origin, regardless of the
    // request's actual Origin header — real browsers are the ones that
    // refuse to expose the response to page JS when it doesn't match their
    // own origin. The property we actually need to guarantee server-side is
    // that we never *echo back* an arbitrary/attacker-supplied origin (a
    // common misconfiguration via `origin: true` or a permissive callback).
    const app = createApp();
    const res = await request(app).get("/health").set("Origin", "https://evil-attacker.example");

    const acao = res.headers["access-control-allow-origin"];
    if (acao !== undefined) {
      expect(acao).toBe(process.env.FRONTEND_URL);
    }
    expect(acao).not.toBe("https://evil-attacker.example");
  });

  it("applies Helmet security headers", async () => {
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("validates the Google auth body shape before hitting the service layer", async () => {
    const app = createApp();
    const res = await request(app).post("/api/auth/google").send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
