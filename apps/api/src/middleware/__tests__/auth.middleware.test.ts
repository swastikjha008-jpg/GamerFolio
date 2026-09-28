import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));
vi.mock("../../config/database", () => ({ prisma: mockPrisma }));

const mockVerifyAppToken = vi.hoisted(() => vi.fn());
vi.mock("../../utils/jwt", () => ({
  verifyAppToken: mockVerifyAppToken,
  AUTH_COOKIE_NAME: "gamerfolio_token",
}));

import { authMiddleware } from "../auth.middleware";
import { errorMiddleware } from "../error.middleware";

function buildApp() {
  const app = express();
  app.get("/protected", authMiddleware, (req, res) => {
    res.json({ success: true, userId: req.user?.id });
  });
  app.use(errorMiddleware);
  return app;
}

describe("authMiddleware — unauthorized request handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a request with no Authorization header at all", async () => {
    const app = buildApp();
    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(mockVerifyAppToken).not.toHaveBeenCalled();
  });

  it("rejects a request with an invalid/expired token", async () => {
    mockVerifyAppToken.mockImplementation(() => {
      throw new Error("jwt expired");
    });
    const app = buildApp();

    const res = await request(app).get("/protected").set("Authorization", "Bearer bad.token.here");

    expect(res.status).toBe(401);
  });

  it("rejects a token for a user that no longer exists", async () => {
    mockVerifyAppToken.mockReturnValue({ userId: "deleted-user" });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const app = buildApp();

    const res = await request(app).get("/protected").set("Authorization", "Bearer valid.token");

    expect(res.status).toBe(401);
  });

  it("allows a request with a valid token through, attaching req.user", async () => {
    mockVerifyAppToken.mockReturnValue({ userId: "user-1" });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    const app = buildApp();

    const res = await request(app).get("/protected").set("Authorization", "Bearer valid.token");

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user-1");
  });
});
