import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env, isDevelopment } from "./config/env";
import { generalRateLimiter } from "./middleware/rateLimit.middleware";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import gameRoutes from "./routes/game.routes";
import userGameRoutes from "./routes/userGame.routes";
import activityRoutes from "./routes/activity.routes";
import messageRoutes from "./routes/message.routes";

export function createApp(): Express {
  const app = express();

  // Render (and most PaaS platforms) sit behind a reverse proxy — trust it
  // so `req.ip` / rate limiting / secure cookies behave correctly.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan(isDevelopment ? "dev" : "combined"));
  app.use("/api", generalRateLimiter);

  // Used by Render's health checks.
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/games", gameRoutes);
  app.use("/api/me/games", userGameRoutes);
  app.use("/api/me/activity", activityRoutes);
  app.use("/api/conversations", messageRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
