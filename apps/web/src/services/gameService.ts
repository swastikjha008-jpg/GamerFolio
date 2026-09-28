import { featuredGames } from "../data/mockGames";
import type { Game } from "../types/models";
import { apiClient } from "./apiClient";

export const gameService = {
  async getGames(): Promise<Game[]> {
    return apiClient.get<Game[]>("/games").catch(() => featuredGames);
  },

  async searchGames(query: string): Promise<Game[]> {
    const normalized = query.trim().toLowerCase();

    if (query.trim()) {
      const remote = await apiClient
        .get<Game[]>(`/games/search?q=${encodeURIComponent(query)}&limit=24`)
        .catch(() => undefined);

      if (remote?.length) {
        return remote;
      }
    }

    if (!normalized) {
      return featuredGames;
    }

    return featuredGames.filter((game) =>
      [game.title, ...game.genres, ...game.platforms]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  },

  async getGameById(id: string): Promise<Game | undefined> {
    return apiClient
      .get<Game>(`/games/${encodeURIComponent(id)}`)
      .catch(() => featuredGames.find((game) => game.id === id || game.slug === id));
  },
};
