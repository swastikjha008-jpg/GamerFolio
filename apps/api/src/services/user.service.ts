import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { parsePagination, buildPaginationMeta, type ParsedPagination } from "../utils/pagination";
import type { User } from "@prisma/client";

/** Fields safe to expose on a public profile — never email/googleId. */
const PUBLIC_PROFILE_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  steamId: true,
  epicGamesId: true,
  createdAt: true,
} as const;

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");
  return user;
}

export interface UpdateMeInput {
  displayName?: string;
  username?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  steamId?: string | null;
  epicGamesId?: string | null;
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<User> {
  if (input.username) {
    const existing = await prisma.user.findUnique({ where: { username: input.username } });
    if (existing && existing.id !== userId) {
      throw AppError.conflict("Username is already taken");
    }
  }

  return prisma.user.update({ where: { id: userId }, data: input });
}

export async function getPublicProfileByUsername(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: PUBLIC_PROFILE_SELECT,
  });
  if (!user) throw AppError.notFound("User not found");
  return user;
}

export async function searchUsers(query: string, pagination: ParsedPagination) {
  const where = {
    OR: [
      { username: { contains: query, mode: "insensitive" as const } },
      { displayName: { contains: query, mode: "insensitive" as const } },
    ],
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: PUBLIC_PROFILE_SELECT,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { username: "asc" },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
}

export async function getUserStats(userId: string) {
  const [totalGames, currentlyPlaying, completed, favorites, hoursAgg] = await Promise.all([
    prisma.userGame.count({ where: { userId } }),
    prisma.userGame.count({ where: { userId, status: "PLAYING" } }),
    prisma.userGame.count({ where: { userId, status: "COMPLETED" } }),
    prisma.userGame.count({ where: { userId, favorite: true } }),
    prisma.userGame.aggregate({ where: { userId }, _sum: { hoursPlayed: true } }),
  ]);

  return {
    totalGames,
    currentlyPlaying,
    completed,
    favorites,
    hoursPlayed: hoursAgg._sum.hoursPlayed ?? 0,
  };
}
