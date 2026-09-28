import { describe, it, expect, beforeEach } from "vitest";
import {
  isRateLimited,
  _resetRateLimiterForTests,
  MESSAGE_RATE_LIMIT_MAX,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
} from "../messageRateLimiter";

describe("isRateLimited", () => {
  beforeEach(() => {
    _resetRateLimiterForTests();
  });

  it("allows sends up to the configured limit", () => {
    const now = 1_000_000;
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX; i++) {
      expect(isRateLimited("user-1", now)).toBe(false);
    }
  });

  it("rejects the send that exceeds the limit within the same window", () => {
    const now = 1_000_000;
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX; i++) {
      isRateLimited("user-1", now);
    }
    expect(isRateLimited("user-1", now)).toBe(true);
  });

  it("tracks each user independently", () => {
    const now = 1_000_000;
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX; i++) {
      isRateLimited("user-1", now);
    }
    expect(isRateLimited("user-1", now)).toBe(true);
    expect(isRateLimited("user-2", now)).toBe(false); // unaffected by user-1's usage
  });

  it("allows sends again once old timestamps fall outside the window", () => {
    const start = 1_000_000;
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX; i++) {
      isRateLimited("user-1", start);
    }
    expect(isRateLimited("user-1", start)).toBe(true);

    const afterWindow = start + MESSAGE_RATE_LIMIT_WINDOW_MS + 1;
    expect(isRateLimited("user-1", afterWindow)).toBe(false);
  });

  it("supports a partial slide — capacity frees up gradually, not all-at-once", () => {
    const start = 1_000_000;
    // Send exactly at the limit, spaced 1ms apart.
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX; i++) {
      isRateLimited("user-1", start + i);
    }
    expect(isRateLimited("user-1", start + MESSAGE_RATE_LIMIT_MAX)).toBe(true);

    // At exactly `start + WINDOW_MS`, only the very first timestamp
    // (sent at `start`) has aged out of the window — the second one
    // (sent at `start + 1`) is still 1ms inside it. Exactly one slot
    // should free up, not two.
    const oneSlotFreed = start + MESSAGE_RATE_LIMIT_WINDOW_MS;
    expect(isRateLimited("user-1", oneSlotFreed)).toBe(false);
    // That slot is immediately re-used — retrying at the same instant fails.
    expect(isRateLimited("user-1", oneSlotFreed)).toBe(true);
  });
});
