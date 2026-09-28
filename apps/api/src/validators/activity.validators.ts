import { z } from "zod";

export const activityQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});
