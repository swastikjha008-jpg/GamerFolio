import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { sendError } from "../utils/response";
import { isProduction } from "../config/env";

/** 404 handler for any route that doesn't match — mounted after all routes. */
export function notFoundMiddleware(req: Request, res: Response): void {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

/**
 * Centralized error handler. Every thrown/forwarded error in the app
 * ends up here. Known error types get friendly, specific responses;
 * anything unexpected is logged server-side and returned as a generic
 * 500 so we never leak stack traces or internals in production.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.status, err.errors);
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "value";
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    sendError(res, "Validation failed", 422, fieldErrors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      sendError(res, `A record with this ${target} already exists`, 409);
      return;
    }
    if (err.code === "P2025") {
      sendError(res, "Record not found", 404);
      return;
    }
  }

  // Unknown/unexpected error — never expose internals to the client.
  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  sendError(res, isProduction ? "Internal server error" : String(err), 500);
}
