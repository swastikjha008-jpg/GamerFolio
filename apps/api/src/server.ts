import { createServer } from "http";
import { createApp } from "./app";
import { createSocketServer } from "./sockets/socket";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";

async function main(): Promise<void> {
  await connectDatabase();
  // eslint-disable-next-line no-console
  console.log("✅ Connected to PostgreSQL");

  const app = createApp();
  const httpServer = createServer(app);
  createSocketServer(httpServer);

  // Render provides the PORT env var at runtime — never hardcode it.
  httpServer.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 GamerFolio backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
