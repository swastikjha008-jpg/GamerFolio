import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, type ParsedPagination } from "../utils/pagination";
import type { ConversationParticipant } from "@prisma/client";

const PARTICIPANT_PROFILE_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

/**
 * Ensures the given user is a participant of the conversation.
 * Throws 403/404 otherwise, so users can never read/write conversations
 * they aren't part of.
 */
async function assertParticipant(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  });
  if (!conversation) throw AppError.notFound("Conversation not found");

  const isParticipant = conversation.participants.some(
    (p: ConversationParticipant) => p.userId === userId
  );
  if (!isParticipant) throw AppError.forbidden("You are not part of this conversation");

  return conversation;
}

export async function listConversations(userId: string, pagination: ParsedPagination) {
  const where = { participants: { some: { userId } } };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { updatedAt: "desc" },
      include: {
        participants: { include: { user: { select: PARTICIPANT_PROFILE_SELECT } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return { conversations, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
}

/**
 * Creates a new one-to-one conversation between `userId` and `otherUserId`,
 * or returns the existing one if it already exists. A user cannot start a
 * conversation with themselves, and duplicate conversations for the same
 * pair are prevented.
 */
export async function createOrGetConversation(userId: string, otherUserId: string) {
  if (userId === otherUserId) {
    throw AppError.badRequest("You cannot start a conversation with yourself");
  }

  const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });
  if (!otherUser) throw AppError.notFound("User not found");

  // Look for an existing 1:1 conversation containing exactly these two users.
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId }} },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    include: {
      participants: { include: { user: { select: PARTICIPANT_PROFILE_SELECT } } },
    },
  });

  if (existing && existing.participants.length === 2) {
    return existing;
  }

  return prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
    include: {
      participants: { include: { user: { select: PARTICIPANT_PROFILE_SELECT } } },
    },
  });
}

export async function getConversationById(conversationId: string, userId: string) {
  const conversation = await assertParticipant(conversationId, userId);
  return prisma.conversation.findUnique({
    where: { id: conversation.id },
    include: {
      participants: { include: { user: { select: PARTICIPANT_PROFILE_SELECT } } },
    },
  });
}

export async function listMessages(
  conversationId: string,
  userId: string,
  pagination: ParsedPagination
) {
  await assertParticipant(conversationId, userId);

  const where = { conversationId };
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.count({ where }),
  ]);

  return { messages, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
}

/**
 * Persists a message to PostgreSQL. This is the single source of truth
 * for message creation — used by both the REST endpoint (not exposed for
 * V1, sending happens over the socket) and the Socket.IO `send_message`
 * handler, which always calls this BEFORE emitting to any client
 * ("database first, realtime delivery second").
 */
export async function createMessage(conversationId: string, senderId: string, content: string) {
  await assertParticipant(conversationId, senderId);

  const message = await prisma.message.create({
    data: { conversationId, senderId, content },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}

export async function getConversationParticipantIds(conversationId: string): Promise<string[]> {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return participants.map((p: { userId: string }) => p.userId);
}

export { assertParticipant };
