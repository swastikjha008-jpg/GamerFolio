import type { Socket } from "socket.io";
import { verifyAppToken } from "../utils/jwt";
import { prisma } from "../config/database";

export interface AuthenticatedSocketData {
  userId: string;
}

/**
 * Socket.IO middleware that authenticates every incoming connection using
 * the same application JWT used by the REST API. The token is expected in
 * `socket.handshake.auth.token` (preferred) or as an `Authorization` header,
 * mirroring the REST auth middleware's flexibility.
 *
 * Unauthenticated connections are rejected before the `connection` event
 * ever fires.
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const authToken =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.startsWith("Bearer ")
        ? socket.handshake.headers.authorization.slice("Bearer ".length)
        : undefined);

    if (!authToken) {
      next(new Error("Authentication token missing"));
      return;
    }

    const payload = verifyAppToken(authToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });

    if (!user) {
      next(new Error("User no longer exists"));
      return;
    }

    (socket.data as AuthenticatedSocketData).userId = user.id;
    next();
  } catch {
    next(new Error("Invalid or expired authentication token"));
  }
}
