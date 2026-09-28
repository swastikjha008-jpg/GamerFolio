/**
 * Per-user sliding-window rate limiter for the Socket.IO `send_message`
 * event. This exists because `express-rate-limit` (used elsewhere in the
 * app) only wraps HTTP middleware — it has no way to throttle a Socket.IO
 * event, and messages are sent exclusively over the socket, not REST.
 *
 * In-memory and per-process, matching the same "simple for V1" trade-off
 * as presence tracking in `chat.socket.ts` — see the README's design notes.
 */

export const MESSAGE_RATE_LIMIT_WINDOW_MS = 60_000;
export const MESSAGE_RATE_LIMIT_MAX = 30;

const sendTimestampsByUser = new Map<string, number[]>();

/**
 * Records a message-send attempt for `userId` at time `now` and returns
 * whether it should be rejected for exceeding the allowed rate.
 * Accepts `now` as a parameter (rather than always reading `Date.now()`)
 * so tests can exercise the sliding window deterministically.
 */
export function isRateLimited(userId: string, now: number = Date.now()): boolean {
  const existing = sendTimestampsByUser.get(userId) ?? [];
  const withinWindow = existing.filter((timestamp) => now - timestamp < MESSAGE_RATE_LIMIT_WINDOW_MS);

  if (withinWindow.length >= MESSAGE_RATE_LIMIT_MAX) {
    sendTimestampsByUser.set(userId, withinWindow);
    return true;
  }

  withinWindow.push(now);
  sendTimestampsByUser.set(userId, withinWindow);
  return false;
}

/** Test-only: clears all tracked state between test cases. */
export function _resetRateLimiterForTests(): void {
  sendTimestampsByUser.clear();
}
