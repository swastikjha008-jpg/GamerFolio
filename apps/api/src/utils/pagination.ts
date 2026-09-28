import type { PaginationMeta, PaginationQuery } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/**
 * Parses `?page=&limit=` query params into safe, bounded values.
 * Prevents callers from requesting massive pages (limit is capped at MAX_LIMIT).
 */
export function parsePagination(query: PaginationQuery): ParsedPagination {
  let page = Number.parseInt(query.page ?? "", 10);
  let limit = Number.parseInt(query.limit ?? "", 10);

  if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
