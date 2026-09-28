import { describe, it, expect } from "vitest";
import { addUserGameSchema, updateUserGameSchema } from "../game.validators";

describe("addUserGameSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = addUserGameSchema.parse({ gameId: "game_123" });
    expect(result.gameId).toBe("game_123");
  });

  it("requires gameId", () => {
    expect(() => addUserGameSchema.parse({})).toThrow();
  });

  it("rejects negative hoursPlayed", () => {
    expect(() => addUserGameSchema.parse({ gameId: "g1", hoursPlayed: -1 })).toThrow();
  });

  it("rejects a rating outside 1-5", () => {
    expect(() => addUserGameSchema.parse({ gameId: "g1", rating: 0 })).toThrow();
    expect(() => addUserGameSchema.parse({ gameId: "g1", rating: 6 })).toThrow();
  });

  it("accepts a rating of exactly 1 and exactly 5", () => {
    expect(addUserGameSchema.parse({ gameId: "g1", rating: 1 }).rating).toBe(1);
    expect(addUserGameSchema.parse({ gameId: "g1", rating: 5 }).rating).toBe(5);
  });

  it("rejects achievementsUnlocked greater than achievementsTotal", () => {
    expect(() =>
      addUserGameSchema.parse({
        gameId: "g1",
        achievementsUnlocked: 10,
        achievementsTotal: 5,
      })
    ).toThrow(/cannot exceed/i);
  });

  it("accepts achievementsUnlocked equal to achievementsTotal", () => {
    const result = addUserGameSchema.parse({
      gameId: "g1",
      achievementsUnlocked: 5,
      achievementsTotal: 5,
    });
    expect(result.achievementsUnlocked).toBe(5);
  });

  it("rejects an invalid status enum value", () => {
    expect(() => addUserGameSchema.parse({ gameId: "g1", status: "PLATINUM" })).toThrow();
  });
});

describe("updateUserGameSchema", () => {
  it("requires at least one field", () => {
    expect(() => updateUserGameSchema.parse({})).toThrow(/at least one field/i);
  });

  it("rejects unknown fields", () => {
    expect(() => updateUserGameSchema.parse({ hacked: true })).toThrow();
  });

  it("allows explicitly clearing achievementsTotal with null", () => {
    const result = updateUserGameSchema.parse({ achievementsTotal: null });
    expect(result.achievementsTotal).toBeNull();
  });
});
