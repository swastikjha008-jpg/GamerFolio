import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../../config/database", () => ({ prisma: mockPrisma }));

import { updateMe } from "../user.service";

describe("updateMe — duplicate username handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects the update when the username is already taken by someone else", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "other-user-id", username: "swastik" });

    await expect(updateMe("me-id", { username: "swastik" })).rejects.toMatchObject({
      status: 409,
    });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("allows the update when the username is unused", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.update.mockResolvedValue({ id: "me-id", username: "newname" });

    const result = await updateMe("me-id", { username: "newname" });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "me-id" },
      data: { username: "newname" },
    });
    expect(result.username).toBe("newname");
  });

  it("allows a user to keep their own current username unchanged", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "me-id", username: "swastik" });
    mockPrisma.user.update.mockResolvedValue({ id: "me-id", username: "swastik", bio: "hi" });

    await expect(updateMe("me-id", { username: "swastik", bio: "hi" })).resolves.toBeTruthy();
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });
});
