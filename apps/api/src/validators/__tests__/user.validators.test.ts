import { describe, it, expect } from "vitest";
import { usernameSchema, updateMeSchema } from "../user.validators";

describe("usernameSchema", () => {
  it("accepts a normal alphanumeric username", () => {
    expect(usernameSchema.parse("Ronaldo_007")).toBe("Ronaldo_007");
  });

  it("rejects usernames shorter than 3 characters", () => {
    expect(() => usernameSchema.parse("ab")).toThrow();
  });

  it("rejects usernames with spaces", () => {
    expect(() => usernameSchema.parse("player one")).toThrow();
  });

  it("rejects usernames with disallowed symbols", () => {
    expect(() => usernameSchema.parse("player@one!")).toThrow();
  });

  it("rejects usernames with consecutive dots/underscores (confusing/unsafe)", () => {
    expect(() => usernameSchema.parse("player__one")).toThrow();
    expect(() => usernameSchema.parse("player..one")).toThrow();
  });

  it("trims surrounding whitespace before validating", () => {
    expect(usernameSchema.parse("  gamer123  ")).toBe("gamer123");
  });
});

describe("updateMeSchema", () => {
  it("requires at least one field", () => {
    expect(() => updateMeSchema.parse({})).toThrow(/at least one field/i);
  });

  it("accepts a partial valid update", () => {
    const result = updateMeSchema.parse({ bio: "Full-stack dev from Lucknow" });
    expect(result.bio).toBe("Full-stack dev from Lucknow");
  });

  it("rejects an unknown/unexpected field (strict mode)", () => {
    expect(() => updateMeSchema.parse({ isAdmin: true })).toThrow();
  });

  it("rejects a bio over 280 characters", () => {
    expect(() => updateMeSchema.parse({ bio: "x".repeat(281) })).toThrow();
  });

  it("rejects a non-URL avatarUrl", () => {
    expect(() => updateMeSchema.parse({ avatarUrl: "not-a-url" })).toThrow();
  });
});
