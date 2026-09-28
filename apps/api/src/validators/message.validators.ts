import { z } from "zod";

export const createConversationSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
});

export const conversationIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const messagesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be at most 2000 characters"),
});
