import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { JwtPayload } from "../types";

/**
 * Signs a minimal application JWT for a user. Only `userId` is embedded —
 * never put email, roles, or anything sensitive/mutable into the token,
 * since it can't be revoked until it expires.
 */
export function signAppToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verifies and decodes an application JWT.
 * Throws if the token is invalid, malformed, or expired.
 */
export function verifyAppToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string" || !("userId" in decoded)) {
    throw new Error("Malformed token payload");
  }
  return decoded as JwtPayload;
}

/**
 * Returns how many milliseconds remain until `token` expires, by reading
 * its `exp` claim directly — so callers (like the auth cookie's `maxAge`)
 * always stay in sync with the token's real lifetime, even if
 * `JWT_EXPIRES_IN` changes, instead of duplicating that duration as a
 * separately hardcoded constant that could drift out of sync.
 */
export function getTokenExpiryMs(token: string): number {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string" || typeof decoded.exp !== "number") {
    // Should never happen for a token we just signed ourselves — fall back
    // to a conservative default rather than throwing.
    return 24 * 60 * 60 * 1000;
  }
  return Math.max(decoded.exp * 1000 - Date.now(), 0);
}

/** Name of the httpOnly cookie used to carry the app JWT for browser clients. */
export const AUTH_COOKIE_NAME = "gamerfolio_token";
