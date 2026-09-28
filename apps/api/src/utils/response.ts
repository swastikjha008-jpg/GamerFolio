import type { Response } from "express";
import type { ApiSuccess, ApiError, PaginationMeta } from "../types";

/** Sends a consistent `{ success: true, data }` JSON response. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { message?: string; status?: number; meta?: PaginationMeta } = {}
): void {
  const { message, status = 200, meta } = options;
  const body: ApiSuccess<T> = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  res.status(status).json(body);
}

/** Sends a consistent `{ success: false, message }` JSON error response. */
export function sendError(
  res: Response,
  message: string,
  status = 400,
  errors?: Record<string, string[]>
): void {
  const body: ApiError = { success: false, message };
  if (errors) body.errors = errors;
  res.status(status).json(body);
}
