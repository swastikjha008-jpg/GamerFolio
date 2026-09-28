import { env } from "../config/env";
import { AppError } from "../utils/AppError";

/**
 * Abstraction over the external game catalogue provider (IGDB).
 *
 * The rest of the application never talks to IGDB directly and never
 * sees IGDB credentials — only this module does. If the provider is ever
 * swapped out (e.g. for RAWG or another catalogue), only this file needs
 * to change; controllers/services/routes stay identical.
 *
 * IGDB authenticates via a Twitch OAuth "client credentials" app token.
 * Docs: https://api-docs.igdb.com/#getting-started
 */

export interface NormalizedGame {
  externalId: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  releaseDate: string | null; // ISO date string
  genres: string[];
  platforms: string[];
}

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE_URL = "https://api.igdb.com/v4";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function isProviderConfigured(): boolean {
  return Boolean(env.GAME_API_CLIENT_ID && env.GAME_API_CLIENT_SECRET);
}

async function getAppAccessToken(): Promise<string> {
  if (!isProviderConfigured()) {
    throw AppError.badRequest(
      "Game catalogue provider is not configured. Set GAME_API_CLIENT_ID and GAME_API_CLIENT_SECRET."
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const params = new URLSearchParams({
    client_id: env.GAME_API_CLIENT_ID,
    client_secret: env.GAME_API_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch(`${TWITCH_TOKEN_URL}?${params.toString()}`, { method: "POST" });
  if (!res.ok) {
    throw AppError.badRequest("Failed to authenticate with the game catalogue provider");
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

function slugify(title: string, externalId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${externalId}`;
}

interface IgdbGame {
  id: number;
  name: string;
  summary?: string;
  cover?: { url: string };
  first_release_date?: number; // unix seconds
  genres?: { name: string }[];
  platforms?: { name: string }[];
}

function normalizeIgdbGame(game: IgdbGame): NormalizedGame {
  return {
    externalId: String(game.id),
    title: game.name,
    slug: slugify(game.name, String(game.id)),
    description: game.summary ?? null,
    // IGDB returns protocol-relative thumb URLs — upgrade to https + full-size cover art.
    coverUrl: game.cover?.url
      ? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
      : null,
    releaseDate: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString()
      : null,
    genres: game.genres?.map((g) => g.name) ?? [],
    platforms: game.platforms?.map((p) => p.name) ?? [],
  };
}

async function igdbQuery(endpoint: string, body: string): Promise<IgdbGame[]> {
  const token = await getAppAccessToken();
  const res = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": env.GAME_API_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!res.ok) {
    throw AppError.badRequest("Game catalogue provider request failed");
  }

  return (await res.json()) as IgdbGame[];
}

const GAME_FIELDS =
  "fields name, summary, cover.url, first_release_date, genres.name, platforms.name;";

/** Searches the external provider for games matching a free-text query. */
export async function searchExternalGames(
  query: string,
  limit: number
): Promise<NormalizedGame[]> {
  const escaped = query.replace(/"/g, '\\"');
  const games = await igdbQuery(
    "games",
    `${GAME_FIELDS} search "${escaped}"; limit ${limit};`
  );
  return games.map(normalizeIgdbGame);
}

/** Fetches a single game by its external (provider) ID. */
export async function fetchExternalGameById(externalId: string): Promise<NormalizedGame | null> {
  const trimmed = externalId.trim();
  const numericId = Number(trimmed);
  // Guards against more than just NaN: `Number("")` and `Number("   ")`
  // both coerce to 0 in JS (not NaN), so an empty/whitespace externalId
  // would otherwise slip past a bare `Number.isFinite` check and still
  // reach IGDB as `where id = 0;`. Real IGDB IDs are positive integers.
  if (
    trimmed.length === 0 ||
    !Number.isFinite(numericId) ||
    !Number.isInteger(numericId) ||
    numericId <= 0
  ) {
    return null;
  }
  const games = await igdbQuery("games", `${GAME_FIELDS} where id = ${numericId};`);
  if (games.length === 0) return null;
  return normalizeIgdbGame(games[0]);
}

export { isProviderConfigured };

/** Test-only: clears the cached provider access token between test cases. */
export function _resetProviderCacheForTests(): void {
  cachedToken = null;
}
