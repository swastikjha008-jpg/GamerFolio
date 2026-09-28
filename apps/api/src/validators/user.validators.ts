import { z } from "zod";

// Letters, numbers, underscores, dots — no spaces, no leading/trailing dot,
// nothing that could be confused for a path segment or be XSS-adjacent.
const USERNAME_REGEX = /^[a-zA-Z0-9_](?!.*[_.]{2})[a-zA-Z0-9_.]{1,28}[a-zA-Z0-9_]$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    USERNAME_REGEX,
    "Username may only contain letters, numbers, underscores, and dots"
  );

export const updateMeSchema = z
  .object({
    displayName: z.string().trim().min(1).max(50).optional(),
    username: usernameSchema.optional(),
    bio: z.string().trim().max(280, "Bio must be at most 280 characters").optional().nullable(),
    avatarUrl: z.string().url("avatarUrl must be a valid URL").optional().nullable(),
    steamId: z.string().trim().max(50).optional().nullable(),
    epicGamesId: z.string().trim().max(50).optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().min(1, "q is required").max(50),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const usernameParamSchema = z.object({
  username: z.string().trim().min(1),
});
