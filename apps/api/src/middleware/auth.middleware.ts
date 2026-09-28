import type { NextFunction, Request, Response } from "express";
import { verifyAppToken, AUTH_COOKIE_NAME } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/database";

/**
 * Extracts the app JWT from either the `Authorization: Bearer <token>`
 * header (used by API clients / mobile) or the httpOnly auth cookie
 * (used by the Next.js frontend in the browser).
 */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    AUTH_COOKIE_NAME
  ];
  if (cookieToken) return cookieToken;

  return null;
}

/**
 * Requires a valid, non-expired application JWT.
 * On success, attaches `{ id: userId }` to `req.user`.
 * Rejects with 401 on missing/invalid/expired tokens.
 */
export const authMiddleware = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      throw AppError.unauthorized("Authentication token missing");
    }

    let payload;
    try {
      payload = verifyAppToken(token);
    } catch {
      throw AppError.unauthorized("Invalid or expired authentication token");
    }

    // Confirm the user still exists (handles deleted accounts gracefully).
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });
    if (!user) {
      throw AppError.unauthorized("User no longer exists");
    }

    req.user = { id: user.id };
    next();
  }
);

/**
 * Like `authMiddleware`, but never throws — if no valid token is present,
 * `req.user` simply stays undefined. Useful for endpoints that behave
 * differently for logged-in vs anonymous users without requiring auth.
 */
export const optionalAuthMiddleware = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return next();

    try {
      const payload = verifyAppToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true },
      });
      if (user) req.user = { id: user.id };
    } catch {
      // Ignore invalid tokens for optional auth — treat as anonymous.
    }
    next();
  }
);
