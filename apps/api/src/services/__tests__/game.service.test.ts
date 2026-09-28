import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  game: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  userGame: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  activity: {
    create: vi.fn(),
  },
}));

vi.mock("../../config/database", () => ({ prisma: mockPrisma }));
vi.mock("../gameProvider.service", () => ({
  fetchExternalGameById: vi.fn(),
  searchExternalGames: vi.fn(),
}));

import { addUserGame, updateUserGame, deleteUserGame } from "../game.service";

const FAKE_GAME = {
  id: "game-1",
  externalId: "ext-1",
  title: "Elden Ring",
  slug: "elden-ring",
};

describe("addUserGame — duplicate prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.game.findUnique.mockResolvedValue(FAKE_GAME);
    mockPrisma.activity.create.mockResolvedValue({});
  });

  it("prevents adding the same game to a library twice", async () => {
    mockPrisma.userGame.findUnique.mockResolvedValue({ id: "existing-entry" });

    await expect(addUserGame("user-1", "game-1", {})).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma.userGame.create).not.toHaveBeenCalled();
  });

  it("adds the game and logs a GAME_ADDED activity when not already owned", async () => {
    mockPrisma.userGame.findUnique.mockResolvedValue(null);
    mockPrisma.userGame.create.mockResolvedValue({
      id: "ug-1",
      userId: "user-1",
      gameId: "game-1",
      game: FAKE_GAME,
    });

    const result = await addUserGame("user-1", "game-1", { status: "PLAYING" });

    expect(result.id).toBe("ug-1");
    expect(mockPrisma.userGame.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "user-1", gameId: "game-1", status: "PLAYING" } })
    );
    expect(mockPrisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "GAME_ADDED", userId: "user-1" }),
      })
    );
  });
});

describe("updateUserGame — ownership + achievement validation", () => {
  const OWNED_ENTRY = {
    id: "ug-1",
    userId: "user-1",
    gameId: "game-1",
    achievementsUnlocked: 5,
    achievementsTotal: 10,
    game: FAKE_GAME,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.activity.create.mockResolvedValue({});
  });

  it("throws 404 when the entry doesn't belong to the user's library", async () => {
    mockPrisma.userGame.findUnique.mockResolvedValue(null);

    await expect(updateUserGame("user-1", "game-1", { hoursPlayed: 5 })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("rejects an update that would push achievementsUnlocked past achievementsTotal", async () => {
    mockPrisma.userGame.findUnique.mockResolvedValue(OWNED_ENTRY);

    await expect(
      updateUserGame("user-1", "game-1", { achievementsUnlocked: 99 })
    ).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.userGame.update).not.toHaveBeenCalled();
  });

  it("applies a valid update and logs GAME_COMPLETED activity on status change", async () => {
    mockPrisma.userGame.findUnique.mockResolvedValue(OWNED_ENTRY);
    mockPrisma.userGame.update.mockResolvedValue({ ...OWNED_ENTRY, status: "COMPLETED" });

    await updateUserGame("user-1", "game-1", { status: "COMPLETED" });

    expect(mockPrisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "GAME_COMPLETED" }) })
    );
  });
});

describe("deleteUserGame — ownership enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.activity.create.mockResolvedValue({});
  });

  it("throws 404 rather than deleting an entry the user doesn't own", async () => {
    mockPrisma.userGame.findUnique.mockResolvedValue(null);

    await expect(deleteUserGame("user-1", "game-1")).rejects.toMatchObject({ status: 404 });
    expect(mockPrisma.userGame.delete).not.toHaveBeenCalled();
  });

  it("deletes an owned entry and logs a GAME_REMOVED activity", async () => {
    mockPrisma.userGame.findUnique.mockResolvedValue({
      id: "ug-1",
      userId: "user-1",
      gameId: "game-1",
      game: FAKE_GAME,
    });
    mockPrisma.userGame.delete.mockResolvedValue({});

    await deleteUserGame("user-1", "game-1");

    expect(mockPrisma.userGame.delete).toHaveBeenCalledWith({ where: { id: "ug-1" } });
    expect(mockPrisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "GAME_REMOVED" }) })
    );
  });
});
