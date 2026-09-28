import { Router } from "express";
import {
  addUserGameHandler,
  listUserGamesHandler,
  getUserGameHandler,
  updateUserGameHandler,
  deleteUserGameHandler,
} from "../controllers/game.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  addUserGameSchema,
  updateUserGameSchema,
  userGamesQuerySchema,
  gameIdInLibraryParamSchema,
} from "../validators/game.validators";

// Mounted at /api/me/games — a user's personal game library.
// All routes require authentication.
const router = Router();

router.use(authMiddleware);

router.post("/", validate({ body: addUserGameSchema }), addUserGameHandler);
router.get("/", validate({ query: userGamesQuerySchema }), listUserGamesHandler);
router.get("/:gameId", validate({ params: gameIdInLibraryParamSchema }), getUserGameHandler);
router.patch(
  "/:gameId",
  validate({ params: gameIdInLibraryParamSchema, body: updateUserGameSchema }),
  updateUserGameHandler
);
router.delete("/:gameId", validate({ params: gameIdInLibraryParamSchema }), deleteUserGameHandler);

export default router;
