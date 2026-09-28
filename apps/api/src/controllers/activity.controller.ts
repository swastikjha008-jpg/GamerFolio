import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { parsePagination } from "../utils/pagination";
import { listActivity } from "../services/activity.service";

/** GET /api/me/activity */
export const listActivityHandler = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query as Record<string, string>);
  const { activities, meta } = await listActivity(req.user!.id, pagination);
  sendSuccess(res, activities, { meta });
});
