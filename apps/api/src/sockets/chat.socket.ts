import type { Server, Socket } from "socket.io";
import { createMessage, assertParticipant, getConversationParticipantIds } from "../services/message.service";
import { isRateLimited, MESSAGE_RATE_LIMIT_MAX } from "./messageRateLimiter";
import type { AuthenticatedSocketData } from "./auth.socket";

/**
 * In-memory map of userId -> set of connected socket IDs for the current
 * Render process. This is intentionally simple, temporary, per-process
 * state — fine for V1. If the app ever needs to scale horizontally across
 * multiple server instances, this would move to Redis (pub/sub + a shared
 * presence store), but that's explicitly out of scope for now.
 */
const onlineUsers = new Map<string, Set<string>>();

function markOnline(userId: string, socketId: string): boolean {
  const wasOffline = !onlineUsers.has(userId) || onlineUsers.get(userId)!.size === 0;
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId)!.add(socketId);
  return wasOffline;
}

function markOffline(userId: string, socketId: string): boolean {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  const isNowOffline = sockets.size === 0;
  if (isNowOffline) onlineUsers.delete(userId);
  return isNowOffline;
}

export function isUserOnline(userId: string): boolean {
  return (onlineUsers.get(userId)?.size ?? 0) > 0;
}

interface SendMessagePayload {
  conversationId: string;
  content: string;
}

interface TypingPayload {
  conversationId: string;
}

const MAX_MESSAGE_LENGTH = 2000;

/** Registers all chat-related event handlers for a single connected socket. */
export function registerChatHandlers(io: Server, socket: Socket): void {
  const { userId } = socket.data as AuthenticatedSocketData;

  const wasOffline = markOnline(userId, socket.id);
  if (wasOffline) {
    socket.broadcast.emit("user_online", { userId });
  }

  socket.on("join_conversation", async (payload: { conversationId: string }, ack?: (res: unknown) => void) => {
    try {
      await assertParticipant(payload.conversationId, userId);
      socket.join(roomName(payload.conversationId));
      ack?.({ success: true });
    } catch (err) {
      ack?.({ success: false, message: (err as Error).message });
    }
  });

  socket.on("send_message", async (payload: SendMessagePayload, ack?: (res: unknown) => void) => {
    try {
      // Rate limit is checked BEFORE content validation, deliberately: it
      // must count every send attempt regardless of validity, or a bot could
      // flood empty/oversized payloads for free and never trip the limiter.
      if (isRateLimited(userId)) {
        throw new Error(
          `You're sending messages too quickly. Limit is ${MESSAGE_RATE_LIMIT_MAX} per minute.`
        );
      }

      const content = payload.content?.trim();
      if (!content) throw new Error("Message cannot be empty");
      if (content.length > MAX_MESSAGE_LENGTH) throw new Error("Message is too long");

      // Database first, realtime delivery second.
      const message = await createMessage(payload.conversationId, userId, content);

      ack?.({ success: true, message });
      // Confirm delivery back to this specific sending connection.
      socket.emit("message_sent", message);

      // Deliver to every OTHER connected device of every participant —
      // via each participant's private user channel, not the conversation
      // room. Using the room here too (in addition to the channel) would
      // double-deliver to anyone who has already `join_conversation`'d,
      // since they'd be present in both. `socket.to(...)` excludes the
      // current socket automatically, so the sender's own other tabs get
      // exactly one copy and this same connection gets none (it already
      // has the message via the `message_sent` emit above).
      const participantIds = await getConversationParticipantIds(payload.conversationId);
      for (const participantId of participantIds) {
        if (participantId === userId) {
          socket.to(userChannel(participantId)).emit("message_received", message);
        } else {
          io.to(userChannel(participantId)).emit("message_received", message);
        }
      }
    } catch (err) {
      ack?.({ success: false, message: (err as Error).message });
    }
  });

  socket.on("typing_start", (payload: TypingPayload) => {
    socket.to(roomName(payload.conversationId)).emit("user_typing", { conversationId: payload.conversationId, userId });
  });

  socket.on("typing_stop", (payload: TypingPayload) => {
    socket.to(roomName(payload.conversationId)).emit("user_stopped_typing", { conversationId: payload.conversationId, userId });
  });

  // Every authenticated socket automatically joins its own private user
  // channel, so it can receive message notifications for conversations
  // whose room it hasn't explicitly joined yet.
  socket.join(userChannel(userId));

  socket.on("disconnect", () => {
    const isNowOffline = markOffline(userId, socket.id);
    if (isNowOffline) {
      socket.broadcast.emit("user_offline", { userId });
    }
  });
}

function roomName(conversationId: string): string {
  return `conversation:${conversationId}`;
}

function userChannel(userId: string): string {
  return `user:${userId}`;
}
