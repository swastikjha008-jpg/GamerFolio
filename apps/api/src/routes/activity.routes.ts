import { Router } from "express";
import { listActivityHandler } from "../controllers/activity.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { activityQuerySchema } from "../validators/activity.validators";

// Mounted at /api/me/activity
const router = Router();

router.get("/", authMiddleware, validate({ query: activityQuerySchema }), listActivityHandler);

export default router;
