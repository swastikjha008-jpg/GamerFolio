import type { Request, Response } from "express";
import type { UserGameStatus } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { parsePagination } from "../utils/pagination";
import {
  searchGames,
  listGames,
  getGameById,
  addUserGame,
  listUserGames,
  getUserGame,
  updateUserGame,
  deleteUserGame,
} from "../services/game.service";

/** GET /api/games */
export const listGamesHandler = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query as Record<string, string>);
  const { games, meta } = await listGames(pagination);
  sendSuccess(res, games, { meta });
});

/** GET /api/games/search */
export const searchGamesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { q, limit } = req.query as { q: string; limit?: string };
  const parsedLimit = Math.min(Number.parseInt(limit ?? "20", 10) || 20, 50);
  const games = await searchGames(q, parsedLimit);
  sendSuccess(res, games);
});

/** GET /api/games/:id */
export const getGameHandler = asyncHandler(async (req: Request, res: Response) => {
  const game = await getGameById(req.params.id);
  sendSuccess(res, game);
});

/** POST /api/me/games */
export const addUserGameHandler = asyncHandler(async (req: Request, res: Response) => {
  const { gameId, ...rest } = req.body;
  const entry = await addUserGame(req.user!.id, gameId, rest);
  sendSuccess(res, entry, { status: 201, message: "Game added to library" });
});

/** GET /api/me/games */
export const listUserGamesHandler = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query as Record<string, string>);
  const { status, favorite } = req.query as { status?: string; favorite?: string };
  const filters = {
    ...(status ? { status: status as UserGameStatus } : {}),
    ...(favorite !== undefined ? { favorite: favorite === "true" } : {}),
  };
  const { entries, meta } = await listUserGames(req.user!.id, pagination, filters);
  sendSuccess(res, entries, { meta });
});

/** GET /api/me/games/:gameId */
export const getUserGameHandler = asyncHandler(async (req: Request, res: Response) => {
  const entry = await getUserGame(req.user!.id, req.params.gameId);
  sendSuccess(res, entry);
});

/** PATCH /api/me/games/:gameId */
export const updateUserGameHandler = asyncHandler(async (req: Request, res: Response) => {
  const entry = await updateUserGame(req.user!.id, req.params.gameId, req.body);
  sendSuccess(res, entry, { message: "Library entry updated" });
});

/** DELETE /api/me/games/:gameId */
export const deleteUserGameHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteUserGame(req.user!.id, req.params.gameId);
  sendSuccess(res, null, { message: "Game removed from library" });
});
