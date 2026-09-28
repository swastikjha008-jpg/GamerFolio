import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { env } from "../config/env";
import { socketAuthMiddleware } from "./auth.socket";
import { registerChatHandlers } from "./chat.socket";

/**
 * Creates and configures the Socket.IO server, attached to the same
 * HTTP server as Express. Must run on the Render backend process —
 * never inside a Vercel serverless function (no persistent connections).
 */
export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    registerChatHandlers(io, socket);
  });

  return io;
}
