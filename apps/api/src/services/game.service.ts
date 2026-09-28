import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, type ParsedPagination } from "../utils/pagination";
import { searchExternalGames, fetchExternalGameById, type NormalizedGame } from "./gameProvider.service";
import { createActivity } from "./activity.service";
import type { UserGameStatus } from "@prisma/client";

/** Upserts a normalized provider game into our local catalogue cache. */
async function upsertGame(normalized: NormalizedGame) {
  return prisma.game.upsert({
    where: { externalId: normalized.externalId },
    update: {
      title: normalized.title,
      description: normalized.description,
      coverUrl: normalized.coverUrl,
      releaseDate: normalized.releaseDate ? new Date(normalized.releaseDate) : null,
      genres: normalized.genres,
      platforms: normalized.platforms,
    },
    create: {
      externalId: normalized.externalId,
      title: normalized.title,
      slug: normalized.slug,
      description: normalized.description,
      coverUrl: normalized.coverUrl,
      releaseDate: normalized.releaseDate ? new Date(normalized.releaseDate) : null,
      genres: normalized.genres,
      platforms: normalized.platforms,
    },
  });
}

/**
 * Searches the game catalogue. Queries the external provider live, then
 * caches normalized results into our own `Game` table so they can be
 * referenced by `UserGame` rows with a stable local ID. The frontend only
 * ever sees our normalized shape — never the provider's raw response.
 */
export async function searchGames(query: string, limit: number) {
  const results = await searchExternalGames(query, limit);
  const games = await Promise.all(results.map(upsertGame));
  return games;
}

/** Lists games already cached in our local catalogue (no external call). */
export async function listGames(pagination: ParsedPagination) {
  const [games, total] = await Promise.all([
    prisma.game.findMany({
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { title: "asc" },
    }),
    prisma.game.count(),
  ]);
  return { games, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
}

/** Fetches one game by our local ID, falling back to the provider + caching if unseen. */
export async function getGameById(id: string) {
  const existing = await prisma.game.findUnique({ where: { id } });
  if (existing) return existing;

  // Not cached locally yet — allow lookup by external ID too, for convenience.
  const byExternalId = await prisma.game.findUnique({ where: { externalId: id } });
  if (byExternalId) return byExternalId;

  const fromProvider = await fetchExternalGameById(id);
  if (!fromProvider) throw AppError.notFound("Game not found");
  return upsertGame(fromProvider);
}

// ─────────────────────────────────────────────
// UserGame (library) CRUD
// ─────────────────────────────────────────────

export interface UserGameInput {
  status?: UserGameStatus;
  hoursPlayed?: number;
  achievementsUnlocked?: number;
  achievementsTotal?: number | null;
  rating?: number | null;
  favorite?: boolean;
  notes?: string | null;
}

export async function addUserGame(userId: string, gameId: string, input: UserGameInput) {
  // Ensure the game exists in our catalogue (fetches + caches from provider if needed).
  const game = await getGameById(gameId);

  const existing = await prisma.userGame.findUnique({
    where: { userId_gameId: { userId, gameId: game.id } },
  });
  if (existing) {
    throw AppError.conflict("This game is already in your library");
  }

  const userGame = await prisma.userGame.create({
    data: { userId, gameId: game.id, ...input },
    include: { game: true },
  });

  await createActivity(userId, "GAME_ADDED", userGame.id, { title: game.title });

  return userGame;
}

export async function listUserGames(
  userId: string,
  pagination: ParsedPagination,
  filters: { status?: UserGameStatus; favorite?: boolean }
) {
  const where = { userId, ...filters };
  const [entries, total] = await Promise.all([
    prisma.userGame.findMany({
      where,
      include: { game: true },
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.userGame.count({ where }),
  ]);
  return { entries, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
}

async function getOwnedUserGame(userId: string, gameId: string) {
  const entry = await prisma.userGame.findUnique({
    where: { userId_gameId: { userId, gameId } },
    include: { game: true },
  });
  if (!entry) throw AppError.notFound("Game not found in your library");
  // Defense in depth: the unique lookup already scopes by userId, so this
  // branch should be unreachable, but we assert intent explicitly per the
  // business rule "a user can only modify their own UserGame entries".
  if (entry.userId !== userId) throw AppError.forbidden("You do not own this library entry");
  return entry;
}

export async function getUserGame(userId: string, gameId: string) {
  return getOwnedUserGame(userId, gameId);
}

export async function updateUserGame(userId: string, gameId: string, input: UserGameInput) {
  const existing = await getOwnedUserGame(userId, gameId);

  const merged = { ...existing, ...input };
  if (
    merged.achievementsTotal != null &&
    merged.achievementsUnlocked > merged.achievementsTotal
  ) {
    throw AppError.badRequest("achievementsUnlocked cannot exceed achievementsTotal");
  }

  const updated = await prisma.userGame.update({
    where: { id: existing.id },
    data: input,
    include: { game: true },
  });

  const activityType = input.status === "COMPLETED" ? "GAME_COMPLETED" : "GAME_UPDATED";
  await createActivity(userId, activityType, updated.id, { title: updated.game.title });

  return updated;
}

export async function deleteUserGame(userId: string, gameId: string) {
  const existing = await getOwnedUserGame(userId, gameId);
  await prisma.userGame.delete({ where: { id: existing.id } });
  await createActivity(userId, "GAME_REMOVED", null, { title: existing.game.title });
}
