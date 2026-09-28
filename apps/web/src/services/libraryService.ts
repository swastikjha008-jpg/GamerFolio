import { apiClient } from "@/services/apiClient";
import type { UserGameStatus, UserGameWithGame } from "@/types/models";

export type UpsertLibraryGameInput = {
  gameId: string;
  status: UserGameStatus;
  hoursPlayed: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  rating?: number;
  notes?: string;
  favorite: boolean;
  completionPercentage?: number;
};

const toApiStatus = (status: UserGameStatus) => status.toUpperCase();
const toUiStatus = (status: string) => status.toLowerCase() as UserGameStatus;

function toApiPayload(input: UpsertLibraryGameInput) {
  return {
    gameId: input.gameId,
    status: toApiStatus(input.status),
    hoursPlayed: input.hoursPlayed,
    achievementsUnlocked: input.achievementsUnlocked,
    achievementsTotal: input.achievementsTotal,
    rating: input.rating ?? null,
    notes: input.notes || null,
    favorite: input.favorite,
  };
}

function normalizeEntry(entry: UserGameWithGame): UserGameWithGame {
  return {
    ...entry,
    status: toUiStatus(String(entry.status)),
    achievementsTotal: entry.achievementsTotal ?? 0,
    completionPercentage:
      entry.completionPercentage ??
      (entry.achievementsTotal
        ? Math.round((entry.achievementsUnlocked / entry.achievementsTotal) * 100)
        : undefined),
    game: {
      ...entry.game,
      releaseDate: entry.game.releaseDate ?? "",
      coverUrl: entry.game.coverUrl ?? "",
      description: entry.game.description ?? "",
    },
  };
}

export const libraryService = {
  async getMyGames(token: string): Promise<UserGameWithGame[]> {
    const entries = await apiClient.get<UserGameWithGame[]>("/me/games?limit=50", token);
    return entries.map(normalizeEntry);
  },

  async addGame(input: UpsertLibraryGameInput, token: string): Promise<UserGameWithGame> {
    const entry = await apiClient.post<UserGameWithGame>("/me/games", toApiPayload(input), token);
    return normalizeEntry(entry);
  },

  async updateGame(
    gameId: string,
    input: UpsertLibraryGameInput,
    token: string,
  ): Promise<UserGameWithGame> {
    const { gameId: _gameId, ...payload } = toApiPayload(input);
    const entry = await apiClient.patch<UserGameWithGame>(
      `/me/games/${encodeURIComponent(gameId)}`,
      payload,
      token,
    );
    return normalizeEntry(entry);
  },

  async removeGame(gameId: string, token: string): Promise<void> {
    await apiClient.delete(`/me/games/${encodeURIComponent(gameId)}`, token);
  },
};
