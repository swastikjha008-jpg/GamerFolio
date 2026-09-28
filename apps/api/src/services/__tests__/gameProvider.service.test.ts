import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.hoisted(() => vi.fn());
global.fetch = mockFetch as unknown as typeof fetch;

import {
  isProviderConfigured,
  searchExternalGames,
  fetchExternalGameById,
  _resetProviderCacheForTests,
} from "../gameProvider.service";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) };
}

beforeEach(() => {
  // `mockReset` (not `mockClear`) also drops any queued `mockResolvedValueOnce`
  // values from a previous test, and resetting the provider's cached token
  // ensures each test's mocked fetch sequence (token, then data) is accurate —
  // otherwise a token cached by an earlier test would silently skip that call.
  mockFetch.mockReset();
  _resetProviderCacheForTests();
});

describe("isProviderConfigured", () => {
  it("reflects whether GAME_API_CLIENT_ID/SECRET are set (they are, in the test env)", () => {
    expect(isProviderConfigured()).toBe(true);
  });
});

describe("fetchExternalGameById — invalid ID guard", () => {
  it("returns null for a non-numeric external ID WITHOUT calling the provider at all", async () => {
    const result = await fetchExternalGameById("not-a-number");

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null for an empty string", async () => {
    const result = await fetchExternalGameById("");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null for a whitespace-only string", async () => {
    const result = await fetchExternalGameById("   ");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null for zero, negative, and non-integer IDs", async () => {
    expect(await fetchExternalGameById("0")).toBeNull();
    expect(await fetchExternalGameById("-5")).toBeNull();
    expect(await fetchExternalGameById("12.5")).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("proceeds to query the provider for a valid numeric ID", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 3600 })) // twitch token
      .mockResolvedValueOnce(jsonResponse([{ id: 1942, name: "The Witcher 3: Wild Hunt" }])); // igdb game

    const result = await fetchExternalGameById("1942");

    expect(result?.externalId).toBe("1942");
    expect(result?.title).toBe("The Witcher 3: Wild Hunt");
  });

  it("returns null when the provider has no game with that numeric ID", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await fetchExternalGameById("999999999");
    expect(result).toBeNull();
  });
});

describe("searchExternalGames — normalization", () => {
  it("normalizes IGDB fields into our shape, upgrading the cover art URL", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 1942,
            name: "The Witcher 3: Wild Hunt",
            summary: "Geralt hunts for Ciri.",
            cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/abc123.jpg" },
            first_release_date: 1431993600, // 2015-05-19 UTC
            genres: [{ name: "RPG" }],
            platforms: [{ name: "PC" }],
          },
        ])
      );

    const [result] = await searchExternalGames("witcher", 10);

    expect(result.externalId).toBe("1942");
    expect(result.slug).toBe("the-witcher-3-wild-hunt-1942");
    expect(result.coverUrl).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big/abc123.jpg");
    expect(result.releaseDate).toBe(new Date(1431993600 * 1000).toISOString());
    expect(result.genres).toEqual(["RPG"]);
    expect(result.platforms).toEqual(["PC"]);
  });

  it("handles a game with no cover, no release date, and no genres/platforms gracefully", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse([{ id: 42, name: "Mystery Game" }]));

    const [result] = await searchExternalGames("mystery", 10);

    expect(result.coverUrl).toBeNull();
    expect(result.releaseDate).toBeNull();
    expect(result.genres).toEqual([]);
    expect(result.platforms).toEqual([]);
  });

  it("reuses a cached Twitch app token across multiple calls instead of refetching", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse([{ id: 1, name: "Game One" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 2, name: "Game Two" }]));

    await searchExternalGames("one", 5);
    await searchExternalGames("two", 5);

    // 1 token fetch + 2 IGDB queries = 3 total fetch calls, NOT 4 — the
    // second search must reuse the still-valid cached token.
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws a client-facing error when the provider request itself fails", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({}, false));

    await expect(searchExternalGames("anything", 5)).rejects.toMatchObject({ status: 400 });
  });
});
