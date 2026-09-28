import type { Request } from "express";

// Augment Express's Request type globally so `req.user` is known everywhere.
// It's optional here because most middleware runs before authentication;
// route handlers behind `authMiddleware` can safely treat it as present
// (see `AuthenticatedRequest` below, used for stronger typing in controllers).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Payload encoded inside the application JWT. */
export interface JwtPayload {
  userId: string;
}

/** Minimal authenticated-user shape attached to requests after auth middleware. */
export interface AuthUser {
  id: string;
}

/** Express Request after authMiddleware has run — `user` is guaranteed. */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
