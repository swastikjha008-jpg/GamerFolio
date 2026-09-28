import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { parsePagination } from "../utils/pagination";
import {
  getMe,
  updateMe,
  getPublicProfileByUsername,
  searchUsers,
  getUserStats,
} from "../services/user.service";

/** GET /api/users/me */
export const getMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const [user, stats] = await Promise.all([getMe(req.user!.id), getUserStats(req.user!.id)]);
  sendSuccess(res, { ...user, stats });
});

/** PATCH /api/users/me */
export const updateMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const updated = await updateMe(req.user!.id, req.body);
  sendSuccess(res, updated, { message: "Profile updated" });
});

/** GET /api/users/me/stats */
export const getMeStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const stats = await getUserStats(req.user!.id);
  sendSuccess(res, stats);
});

/** GET /api/users/search */
export const searchUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query as { q: string };
  const pagination = parsePagination(req.query as Record<string, string>);
  const { users, meta } = await searchUsers(q, pagination);
  sendSuccess(res, users, { meta });
});

/** GET /api/users/:username */
export const getPublicProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getPublicProfileByUsername(req.params.username);
  sendSuccess(res, profile);
});
