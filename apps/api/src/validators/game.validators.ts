import { z } from "zod";
import { UserGameStatus } from "@prisma/client";

export const gameSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "q is required").max(100),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const gameListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const gameIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const gameIdInLibraryParamSchema = z.object({
  gameId: z.string().trim().min(1),
});

const baseUserGameFields = {
  status: z.nativeEnum(UserGameStatus).optional(),
  hoursPlayed: z.number().min(0, "hoursPlayed cannot be negative").optional(),
  achievementsUnlocked: z.number().int().min(0, "achievementsUnlocked cannot be negative").optional(),
  achievementsTotal: z.number().int().min(0, "achievementsTotal cannot be negative").optional().nullable(),
  rating: z.number().int().min(1, "rating must be between 1 and 5").max(5, "rating must be between 1 and 5").optional().nullable(),
  favorite: z.boolean().optional(),
  notes: z.string().trim().max(1000, "notes must be at most 1000 characters").optional().nullable(),
};

export const addUserGameSchema = z
  .object({
    gameId: z.string().trim().min(1, "gameId is required"),
    ...baseUserGameFields,
  })
  .refine(
    (data) =>
      data.achievementsUnlocked === undefined ||
      data.achievementsTotal === undefined ||
      data.achievementsTotal === null ||
      data.achievementsUnlocked <= data.achievementsTotal,
    {
      message: "achievementsUnlocked cannot exceed achievementsTotal",
      path: ["achievementsUnlocked"],
    }
  );

export const updateUserGameSchema = z
  .object(baseUserGameFields)
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(
    (data) =>
      data.achievementsUnlocked === undefined ||
      data.achievementsTotal === undefined ||
      data.achievementsTotal === null ||
      data.achievementsUnlocked <= data.achievementsTotal,
    {
      message: "achievementsUnlocked cannot exceed achievementsTotal",
      path: ["achievementsUnlocked"],
    }
  );

export const userGamesQuerySchema = z.object({
  status: z.nativeEnum(UserGameStatus).optional(),
  favorite: z.enum(["true", "false"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
