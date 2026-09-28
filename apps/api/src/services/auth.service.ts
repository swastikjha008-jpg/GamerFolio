import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { signAppToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import type { User } from "@prisma/client";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Verifies a Google ID token/credential using Google's official library
 * (never trust a client-provided profile object directly — the token is
 * cryptographically verified against Google's public keys here).
 */
export async function verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw AppError.unauthorized("Invalid Google credential");
  }

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw AppError.unauthorized("Google credential did not include required profile data");
  }

  if (payload.email_verified === false) {
    throw AppError.unauthorized("Google email is not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0],
    avatarUrl: payload.picture ?? null,
  };
}

/** Derives a unique, URL-safe username candidate from an email/name. */
async function generateUniqueUsername(seed: string): Promise<string> {
  const base = seed
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 20) || "player";

  let candidate = base;
  let suffix = 0;

  // Extremely unlikely to loop more than once or twice in practice.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
}

/**
 * Finds an existing user by Google ID, or creates one from the verified
 * Google profile. Never creates duplicate accounts for the same Google ID
 * or email — both are unique constraints at the database level too.
 */
export async function findOrCreateUser(profile: GoogleProfile): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (existing) return existing;

  const emailTaken = await prisma.user.findUnique({ where: { email: profile.email } });
  if (emailTaken) {
    throw AppError.conflict("An account with this email already exists");
  }

  const username = await generateUniqueUsername(profile.name || profile.email.split("@")[0]);

  return prisma.user.create({
    data: {
      googleId: profile.googleId,
      email: profile.email,
      username,
      displayName: profile.name,
      avatarUrl: profile.avatarUrl,
    },
  });
}

export function issueSessionToken(userId: string): string {
  return signAppToken({ userId });
}
