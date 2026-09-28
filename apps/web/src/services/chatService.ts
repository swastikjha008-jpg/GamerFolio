import { conversations, messages } from "@/data/mockAppData";
import { apiClient } from "@/services/apiClient";
import type { Conversation, Message } from "@/types/models";

export const chatService = {
  async getConversations(token?: string): Promise<Conversation[]> {
    return apiClient.get<Conversation[]>("/conversations", token).catch(() => conversations);
  },

  async getMessages(conversationId: string, token?: string): Promise<Message[]> {
    return apiClient
      .get<Message[]>(`/conversations/${conversationId}/messages`, token)
      .catch(() => messages.filter((message) => message.conversationId === conversationId));
  },
};
