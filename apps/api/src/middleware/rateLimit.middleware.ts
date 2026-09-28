import rateLimit from "express-rate-limit";
import { sendError } from "../utils/response";

/** General limiter applied to all /api routes. */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, "Too many requests. Please try again later.", 429);
  },
});

/** Stricter limiter for auth endpoints, which are common brute-force targets. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, "Too many authentication attempts. Please try again later.", 429);
  },
});
