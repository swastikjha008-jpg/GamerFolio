import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  conversation: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  message: { create: vi.fn() },
}));

vi.mock("../../config/database", () => ({ prisma: mockPrisma }));

import { createOrGetConversation, createMessage } from "../message.service";

describe("createOrGetConversation — one-to-one rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a user trying to message themselves", async () => {
    await expect(createOrGetConversation("user-1", "user-1")).rejects.toMatchObject({
      status: 400,
    });
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  it("throws 404 when the other user doesn't exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(createOrGetConversation("user-1", "ghost-user")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("returns the existing conversation instead of creating a duplicate", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-2" });
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: "conv-1",
      participants: [{ userId: "user-1" }, { userId: "user-2" }],
    });

    const result = await createOrGetConversation("user-1", "user-2");

    expect(result.id).toBe("conv-1");
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  it("creates a new conversation when none exists yet", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-2" });
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    mockPrisma.conversation.create.mockResolvedValue({ id: "conv-new", participants: [] });

    const result = await createOrGetConversation("user-1", "user-2");

    expect(result.id).toBe("conv-new");
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { participants: { create: [{ userId: "user-1" }, { userId: "user-2" }] } },
      })
    );
  });
});

describe("createMessage — persistence + membership enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a message from someone who isn't a participant", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      participants: [{ userId: "user-1" }, { userId: "user-2" }],
    });

    await expect(createMessage("conv-1", "user-3", "hi")).rejects.toMatchObject({ status: 403 });
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });

  it("throws 404 for a conversation that doesn't exist", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    await expect(createMessage("missing-conv", "user-1", "hi")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("persists the message before it would be broadcast (DB is the source of truth)", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      participants: [{ userId: "user-1" }, { userId: "user-2" }],
    });
    mockPrisma.message.create.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
      content: "gg",
    });
    mockPrisma.conversation.update.mockResolvedValue({});

    const message = await createMessage("conv-1", "user-1", "gg");

    expect(mockPrisma.message.create).toHaveBeenCalledWith({
      data: { conversationId: "conv-1", senderId: "user-1", content: "gg" },
    });
    expect(message.id).toBe("msg-1");
  });
});
