import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { parsePagination } from "../utils/pagination";
import {
  listConversations,
  createOrGetConversation,
  getConversationById,
  listMessages,
} from "../services/message.service";

/** GET /api/conversations */
export const listConversationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query as Record<string, string>);
  const { conversations, meta } = await listConversations(req.user!.id, pagination);
  sendSuccess(res, conversations, { meta });
});

/** POST /api/conversations */
export const createConversationHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body as { userId: string };
  const conversation = await createOrGetConversation(req.user!.id, userId);
  sendSuccess(res, conversation, { status: 201 });
});

/** GET /api/conversations/:id */
export const getConversationHandler = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await getConversationById(req.params.id, req.user!.id);
  sendSuccess(res, conversation);
});

/** GET /api/conversations/:id/messages */
export const listMessagesHandler = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query as Record<string, string>);
  const { messages, meta } = await listMessages(req.params.id, req.user!.id, pagination);
  sendSuccess(res, messages, { meta });
});
