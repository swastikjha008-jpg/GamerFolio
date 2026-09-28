import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { signAppToken, verifyAppToken, getTokenExpiryMs } from "../jwt";

describe("signAppToken / verifyAppToken", () => {
  it("round-trips a userId through sign and verify", () => {
    const token = signAppToken({ userId: "user-123" });
    const payload = verifyAppToken(token);
    expect(payload.userId).toBe("user-123");
  });

  it("throws for a tampered/invalid token", () => {
    const token = signAppToken({ userId: "user-123" });
    expect(() => verifyAppToken(token + "tampered")).toThrow();
  });

  it("throws for a token signed with a different secret", () => {
    const foreignToken = jwt.sign({ userId: "user-123" }, "some-other-secret");
    expect(() => verifyAppToken(foreignToken)).toThrow();
  });

  it("throws for an expired token", () => {
    // Sign directly with jsonwebtoken using our real secret, but an already-past expiry.
    const expired = jwt.sign({ userId: "user-123" }, process.env.JWT_SECRET as string, {
      expiresIn: -10, // expired 10 seconds ago
    });
    expect(() => verifyAppToken(expired)).toThrow(/expired/i);
  });
});

describe("getTokenExpiryMs", () => {
  it("returns a value close to the token's actual configured lifetime", () => {
    const token = signAppToken({ userId: "user-123" }); // JWT_EXPIRES_IN=7d in test env
    const ms = getTokenExpiryMs(token);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Allow a small tolerance for the time elapsed during the test itself.
    expect(ms).toBeGreaterThan(sevenDaysMs - 5000);
    expect(ms).toBeLessThanOrEqual(sevenDaysMs);
  });

  it("returns 0 (not negative) for an already-expired token", () => {
    const expired = jwt.sign({ userId: "user-123" }, process.env.JWT_SECRET as string, {
      expiresIn: -10,
    });
    expect(getTokenExpiryMs(expired)).toBe(0);
  });

  it("stays in sync even if the token's expiry changes, unlike a hardcoded constant", () => {
    const shortLived = jwt.sign({ userId: "user-123" }, process.env.JWT_SECRET as string, {
      expiresIn: "1h",
    });
    const ms = getTokenExpiryMs(shortLived);
    expect(ms).toBeLessThanOrEqual(60 * 60 * 1000);
    expect(ms).toBeGreaterThan(60 * 60 * 1000 - 5000);
  });
});
