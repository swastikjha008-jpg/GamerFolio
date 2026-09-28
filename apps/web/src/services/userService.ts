import { users } from "@/data/mockAppData";
import { apiClient } from "@/services/apiClient";
import type { User } from "@/types/models";

export const userService = {
  async getUsers(): Promise<User[]> {
    return apiClient.get<User[]>("/users/search?limit=12").catch(() => users);
  },

  async searchUsers(query: string): Promise<User[]> {
    const normalized = query.replace("@", "").trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    const remote = await apiClient
      .get<User[]>(`/users/search?q=${encodeURIComponent(normalized)}&limit=12`)
      .catch(() => undefined);

    if (remote?.length) {
      return remote;
    }

    return users.filter((user) =>
      [user.username, user.displayName, user.name, user.bio ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const normalized = username.replace("@", "");

    return apiClient
      .get<User>(`/users/${encodeURIComponent(normalized)}`)
      .catch(() => users.find((user) => user.username === normalized));
  },
};
