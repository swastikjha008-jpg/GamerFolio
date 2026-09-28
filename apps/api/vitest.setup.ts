// Ensures `src/config/env.ts` (which validates and hard-exits on missing
// vars) never fails during tests, without requiring a real `.env` file or
// real credentials. Runs before any test file's imports are evaluated.

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/gamerfolio_test";
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "test-google-client-secret";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test-jwt-secret-at-least-32-characters-long-000";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
process.env.GAME_API_CLIENT_ID = process.env.GAME_API_CLIENT_ID ?? "test-game-api-client-id";
process.env.GAME_API_CLIENT_SECRET = process.env.GAME_API_CLIENT_SECRET ?? "test-game-api-client-secret";
