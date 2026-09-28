import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { verifyGoogleCredential, findOrCreateUser, issueSessionToken } from "../services/auth.service";
import { AUTH_COOKIE_NAME, getTokenExpiryMs } from "../utils/jwt";
import { isProduction } from "../config/env";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: getTokenExpiryMs(token),
    path: "/",
  });
}

/** POST /api/auth/google */
export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.body as { credential: string };

  const profile = await verifyGoogleCredential(credential);
  const user = await findOrCreateUser(profile);
  const token = issueSessionToken(user.id);

  setAuthCookie(res, token);

  sendSuccess(
    res,
    { token, user },
    { message: "Authenticated successfully" }
  );
});

/** GET /api/auth/me */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw AppError.notFound("User not found");
  sendSuccess(res, user);
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // JWTs are stateless for V1, so "logout" clears the client's session cookie.
  // The token itself remains technically valid until it expires; if a
  // hard-revocation guarantee is needed later, swap this for a short-lived
  // access token + refresh token pair with a server-side revocation list.
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  sendSuccess(res, null, { message: "Logged out" });
});
