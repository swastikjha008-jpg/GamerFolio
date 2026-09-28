import { Router } from "express";
import {
  getMeHandler,
  updateMeHandler,
  getMeStatsHandler,
  searchUsersHandler,
  getPublicProfileHandler,
} from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  updateMeSchema,
  searchUsersQuerySchema,
  usernameParamSchema,
} from "../validators/user.validators";

const router = Router();

// NOTE: `/search` and `/me` must be registered BEFORE the generic
// `/:username` route below, or Express would treat "search"/"me" as a
// username lookup instead.
router.get("/me", authMiddleware, getMeHandler);
router.patch("/me", authMiddleware, validate({ body: updateMeSchema }), updateMeHandler);
router.get("/me/stats", authMiddleware, getMeStatsHandler);
router.get("/search", validate({ query: searchUsersQuerySchema }), searchUsersHandler);
router.get("/:username", validate({ params: usernameParamSchema }), getPublicProfileHandler);

export default router;
