import { prisma } from "../config/database";
import { buildPaginationMeta, type ParsedPagination } from "../utils/pagination";
import type { ActivityType, Prisma } from "@prisma/client";

/**
 * Activities are always generated automatically by other services in
 * response to important game actions — there is no public "create activity"
 * endpoint, by design (see spec: "the user should not manually create activities").
 */
export async function createActivity(
  userId: string,
  type: ActivityType,
  userGameId: string | null,
  metadata: Record<string, unknown> = {}
) {
  return prisma.activity.create({
    data: {
      userId,
      type,
      userGameId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}

export async function listActivity(userId: string, pagination: ParsedPagination) {
  const where = { userId };
  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: { userGame: { include: { game: true } } },
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.activity.count({ where }),
  ]);
  return { activities, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
}
