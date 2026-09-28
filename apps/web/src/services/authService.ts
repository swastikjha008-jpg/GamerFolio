import { currentUser } from "@/data/mockAppData";
import { apiClient } from "@/services/apiClient";
import type { User } from "@/types/models";

export type AuthSession = {
  user: User | null;
  isAuthenticated: boolean;
  hasCompletedSetup: boolean;
  token?: string;
};

export const authService = {
  async continueWithGoogle(credential?: string): Promise<AuthSession> {
    if (credential) {
      const data = await apiClient.post<{ token: string; user: User }>("/auth/google", {
        credential,
      });

      return {
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        hasCompletedSetup: Boolean(data.user.username),
      };
    }

    return {
      user: currentUser,
      token: "demo-token",
      isAuthenticated: true,
      hasCompletedSetup: false,
    };
  },

  async signOut(token?: string): Promise<AuthSession> {
    if (token && token !== "demo-token") {
      await apiClient.post("/auth/logout", undefined, token).catch(() => undefined);
    }

    return {
      user: null,
      isAuthenticated: false,
      hasCompletedSetup: false,
    };
  },
};
