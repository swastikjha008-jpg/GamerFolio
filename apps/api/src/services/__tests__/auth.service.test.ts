import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyIdToken = vi.hoisted(() => vi.fn());

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../../config/database", () => ({ prisma: mockPrisma }));

import { verifyGoogleCredential, findOrCreateUser } from "../auth.service";

describe("verifyGoogleCredential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a credential that fails Google verification", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));

    await expect(verifyGoogleCredential("garbage-token")).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a token whose email is unverified", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-123",
        email: "test@example.com",
        email_verified: false,
        name: "Test User",
      }),
    });

    await expect(verifyGoogleCredential("token")).rejects.toMatchObject({ status: 401 });
  });

  it("returns a normalized profile for a valid, verified token", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-123",
        email: "test@example.com",
        email_verified: true,
        name: "Test User",
        picture: "https://example.com/avatar.png",
      }),
    });

    const profile = await verifyGoogleCredential("token");

    expect(profile).toEqual({
      googleId: "google-123",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.png",
    });
  });
});

describe("findOrCreateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const PROFILE = {
    googleId: "google-123",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: null,
  };

  it("returns the existing user without creating a duplicate", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "user-1", ...PROFILE });

    const user = await findOrCreateUser(PROFILE);

    expect(user.id).toBe("user-1");
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects creating a new account when the email is already taken by a different Google ID", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null) // no user with this googleId
      .mockResolvedValueOnce({ id: "someone-else", email: PROFILE.email }); // email taken

    await expect(findOrCreateUser(PROFILE)).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("creates a new user with a generated username when none exists yet", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null) // no user with this googleId
      .mockResolvedValueOnce(null) // email not taken
      .mockResolvedValueOnce(null); // generated username is free
    mockPrisma.user.create.mockResolvedValue({ id: "new-user", username: "testuser" });

    const user = await findOrCreateUser(PROFILE);

    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(user.id).toBe("new-user");
  });
});
