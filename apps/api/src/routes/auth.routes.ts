import { Router } from "express";
import { googleAuth, getCurrentUser, logout } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/rateLimit.middleware";
import { validate } from "../middleware/validation.middleware";
import { googleAuthSchema } from "../validators/auth.validators";

const router = Router();

router.post("/google", authRateLimiter, validate({ body: googleAuthSchema }), googleAuth);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/logout", authMiddleware, logout);

export default router;
