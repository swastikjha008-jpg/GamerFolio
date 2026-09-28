import { Router } from "express";
import {
  listGamesHandler,
  searchGamesHandler,
  getGameHandler,
} from "../controllers/game.controller";
import { validate } from "../middleware/validation.middleware";
import {
  gameListQuerySchema,
  gameSearchQuerySchema,
  gameIdParamSchema,
} from "../validators/game.validators";

const router = Router();

// `/search` must come before `/:id`.
router.get("/search", validate({ query: gameSearchQuerySchema }), searchGamesHandler);
router.get("/", validate({ query: gameListQuerySchema }), listGamesHandler);
router.get("/:id", validate({ params: gameIdParamSchema }), getGameHandler);

export default router;
