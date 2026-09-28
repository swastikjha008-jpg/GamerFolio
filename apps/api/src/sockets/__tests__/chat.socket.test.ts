import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer, type Server as HttpServer } from "http";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import type { AddressInfo } from "net";

// ── Mocks ──────────────────────────────────────────────────────────────
// verifyAppToken maps fake bearer tokens straight to user IDs, so tests
// don't need real JWTs.
const mockVerifyAppToken = vi.hoisted(() => vi.fn((token: string) => ({ userId: token })));
vi.mock("../../utils/jwt", () => ({
  verifyAppToken: mockVerifyAppToken,
  AUTH_COOKIE_NAME: "gamerfolio_token",
}));

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn((args: { where: { id: string } }) => Promise.resolve({ id: args.where.id })) },
}));
vi.mock("../../config/database", () => ({ prisma: mockPrisma }));

const mockCreateMessage = vi.hoisted(() => vi.fn());
const mockAssertParticipant = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetConversationParticipantIds = vi.hoisted(() => vi.fn());
vi.mock("../../services/message.service", () => ({
  createMessage: mockCreateMessage,
  assertParticipant: mockAssertParticipant,
  getConversationParticipantIds: mockGetConversationParticipantIds,
}));

import { createSocketServer } from "../socket";
import { _resetRateLimiterForTests, MESSAGE_RATE_LIMIT_MAX } from "../messageRateLimiter";

// ── Test harness ──────────────────────────────────────────────────────

let httpServer: HttpServer;
let port: number;
const openClients: ClientSocket[] = [];

function connectAs(userId: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(`http://localhost:${port}`, {
      auth: { token: userId }, // mocked verifyAppToken just echoes this back as userId
      transports: ["websocket"],
      forceNew: true,
    });
    openClients.push(client);
    client.on("connect", () => resolve(client));
    client.on("connect_error", reject);
  });
}

function waitForEvent<T = unknown>(client: ClientSocket, event: string, timeoutMs = 1000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeoutMs);
    client.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Resolves after `ms` with whatever events fired on `event`, to assert an event did NOT fire. */
function collectEvents<T = unknown>(client: ClientSocket, event: string, ms = 300): Promise<T[]> {
  const received: T[] = [];
  const handler = (payload: T) => received.push(payload);
  client.on(event, handler);
  return new Promise((resolve) => {
    setTimeout(() => {
      client.off(event, handler);
      resolve(received);
    }, ms);
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  _resetRateLimiterForTests(); // avoid cross-test pollution — several tests reuse "user-A"
  mockAssertParticipant.mockResolvedValue(undefined);
  mockPrisma.user.findUnique.mockImplementation((args: { where: { id: string } }) =>
    Promise.resolve({ id: args.where.id })
  );

  httpServer = createServer();
  createSocketServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;
});

afterEach(async () => {
  for (const client of openClients.splice(0)) client.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe("chat socket — send_message delivery (regression test)", () => {
  it("delivers exactly once to the recipient, and only 'message_sent' (not 'message_received') to the sender's own socket", async () => {
    const persistedMessage = { id: "msg-1", conversationId: "conv-1", senderId: "user-A", content: "gg" };
    mockCreateMessage.mockResolvedValue(persistedMessage);
    mockGetConversationParticipantIds.mockResolvedValue(["user-A", "user-B"]);

    const clientA = await connectAs("user-A");
    const clientB = await connectAs("user-B");

    // Both join the conversation room — this is exactly the scenario that
    // triggered the original double-delivery bug (room broadcast +
    // per-participant channel broadcast both firing for user-B).
    await new Promise<void>((resolve) => clientA.emit("join_conversation", { conversationId: "conv-1" }, () => resolve()));
    await new Promise<void>((resolve) => clientB.emit("join_conversation", { conversationId: "conv-1" }, () => resolve()));

    const bReceivedPromise = collectEvents(clientB, "message_received", 400);
    const aReceivedPromise = collectEvents(clientA, "message_received", 400);
    const aSentPromise = waitForEvent(clientA, "message_sent");

    clientA.emit("send_message", { conversationId: "conv-1", content: "gg" });

    const [bReceived, aReceived, aSent] = await Promise.all([bReceivedPromise, aReceivedPromise, aSentPromise]);

    expect(bReceived).toHaveLength(1);
    expect(bReceived[0]).toEqual(persistedMessage);
    expect(aReceived).toHaveLength(0); // sender's own connection must NOT get message_received
    expect(aSent).toEqual(persistedMessage);
  });

  it("delivers to the sender's OTHER open tab, but not back to the sending tab itself", async () => {
    const persistedMessage = { id: "msg-2", conversationId: "conv-1", senderId: "user-A", content: "hi" };
    mockCreateMessage.mockResolvedValue(persistedMessage);
    mockGetConversationParticipantIds.mockResolvedValue(["user-A", "user-B"]);

    const tab1 = await connectAs("user-A");
    const tab2 = await connectAs("user-A"); // same user, second connection

    const tab2Received = waitForEvent(tab2, "message_received");
    const tab1SentPromise = waitForEvent(tab1, "message_sent");
    const tab1ReceivedCollector = collectEvents(tab1, "message_received", 400);

    tab1.emit("send_message", { conversationId: "conv-1", content: "hi" });

    const [received2, sent1, received1] = await Promise.all([tab2Received, tab1SentPromise, tab1ReceivedCollector]);

    expect(received2).toEqual(persistedMessage);
    expect(sent1).toEqual(persistedMessage);
    expect(received1).toHaveLength(0);
  });

  it("rejects an empty message and never calls createMessage", async () => {
    const clientA = await connectAs("user-A");

    const ack = await new Promise<{ success: boolean; message?: string }>((resolve) => {
      clientA.emit("send_message", { conversationId: "conv-1", content: "   " }, resolve);
    });

    expect(ack.success).toBe(false);
    expect(mockCreateMessage).not.toHaveBeenCalled();
  });

  it("counts an invalid (empty) send against the rate limit — spam can't dodge it by being invalid", async () => {
    const clientA = await connectAs("user-A");

    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX; i++) {
      const ack = await new Promise<{ success: boolean }>((resolve) => {
        clientA.emit("send_message", { conversationId: "conv-1", content: "   " }, resolve);
      });
      expect(ack.success).toBe(false); // rejected for being empty, every time
    }

    // Quota should now be exhausted purely from invalid attempts — the
    // very next send, even a perfectly valid one, must also be rejected,
    // but for the rate-limit reason rather than a content reason.
    mockCreateMessage.mockResolvedValue({ id: "msg-1", conversationId: "conv-1", senderId: "user-A", content: "valid" });
    const finalAck = await new Promise<{ success: boolean; message?: string }>((resolve) => {
      clientA.emit("send_message", { conversationId: "conv-1", content: "valid" }, resolve);
    });

    expect(finalAck.success).toBe(false);
    expect(finalAck.message).toMatch(/too quickly/i);
    expect(mockCreateMessage).not.toHaveBeenCalled();
  }, 10_000);

  it("rejects a connection with no auth token", async () => {
    const client = ioClient(`http://localhost:${port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    openClients.push(client);

    const err = await new Promise<Error>((resolve) => {
      client.on("connect_error", resolve);
      client.on("connect", () => resolve(new Error("should not have connected")));
    });

    expect(err.message).toMatch(/token missing/i);
  });
});

describe("chat socket — message rate limiting (regression test)", () => {
  it("allows sends up to the limit, then rejects further sends in the same window without persisting them", async () => {
    mockGetConversationParticipantIds.mockResolvedValue(["user-A", "user-B"]);
    let counter = 0;
    mockCreateMessage.mockImplementation(() =>
      Promise.resolve({ id: `msg-${++counter}`, conversationId: "conv-1", senderId: "user-A", content: "spam" })
    );

    const clientA = await connectAs("user-A");

    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX; i++) {
      const ack = await new Promise<{ success: boolean }>((resolve) => {
        clientA.emit("send_message", { conversationId: "conv-1", content: `msg ${i}` }, resolve);
      });
      expect(ack.success).toBe(true);
    }
    expect(mockCreateMessage).toHaveBeenCalledTimes(MESSAGE_RATE_LIMIT_MAX);

    const rejectedAck = await new Promise<{ success: boolean; message?: string }>((resolve) => {
      clientA.emit("send_message", { conversationId: "conv-1", content: "one too many" }, resolve);
    });

    expect(rejectedAck.success).toBe(false);
    expect(rejectedAck.message).toMatch(/too quickly/i);
    // The rejected attempt must never reach persistence — no wasted DB write.
    expect(mockCreateMessage).toHaveBeenCalledTimes(MESSAGE_RATE_LIMIT_MAX);
  }, 10_000);

  it("does not rate-limit one user based on another user's message volume", async () => {
    mockGetConversationParticipantIds.mockResolvedValue(["user-A", "user-B"]);
    mockCreateMessage.mockResolvedValue({ id: "msg-x", conversationId: "conv-1", senderId: "user-A", content: "x" });

    const clientA = await connectAs("user-A");
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX; i++) {
      await new Promise((resolve) => clientA.emit("send_message", { conversationId: "conv-1", content: "x" }, resolve));
    }

    const clientC = await connectAs("user-C");
    const ack = await new Promise<{ success: boolean }>((resolve) => {
      clientC.emit("send_message", { conversationId: "conv-1", content: "hello" }, resolve);
    });

    expect(ack.success).toBe(true);
  }, 10_000);
});
