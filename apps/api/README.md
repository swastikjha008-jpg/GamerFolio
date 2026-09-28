# GamerFolio — Backend

The backend API and realtime server for **GamerFolio**, a gaming identity and
game-tracking application. It powers Google authentication, public/private
profiles, a searchable game catalogue, a per-user game library with
status/hours/achievements/rating tracking, an auto-generated activity
timeline, and one-to-one realtime chat.

This backend is a separate deployment from the [GamerFolio frontend](#) and
is designed to be simple, understandable, and easy to extend — not a
microservices platform.

---

## Stack

- **Node.js** + **TypeScript**
- **Express.js** — REST API
- **PostgreSQL** + **Prisma ORM** — database
- **Socket.IO** — realtime chat
- **Zod** — request validation
- **Google Auth Library** — Google ID token verification
- **JWT** (`jsonwebtoken`) — application session tokens
- **Helmet**, **CORS**, **express-rate-limit** — security
- **Vitest** + **Supertest** — testing

## Architecture

```
GamerFolio Frontend (Next.js)  →  Vercel
GamerFolio Backend (Express)   →  Render
Database (PostgreSQL)          →  Managed Postgres (Render/Railway/etc.)

Frontend  ── REST (HTTPS) ──▶  Backend
Frontend  ── Socket.IO    ──▶  Backend
Backend   ── Prisma       ──▶  PostgreSQL
```

The Socket.IO server runs **inside the same Express/Node process on
Render** — it is never hosted in a Vercel serverless function, since
serverless functions can't hold persistent WebSocket connections.

## Project Structure

```text
src/
├── config/         # env validation, Prisma client singleton
├── controllers/     # thin HTTP handlers — call services, format responses
├── routes/          # Express routers, one per resource
├── middleware/       # auth, error handling, rate limiting, validation
├── services/         # business logic + Prisma queries
├── sockets/          # Socket.IO server, auth, chat event handlers
├── validators/       # Zod schemas per resource
├── utils/            # jwt, response helpers, pagination, AppError
├── types/            # shared TypeScript types (Express Request augmentation)
├── app.ts            # Express app assembly
└── server.ts         # process entrypoint (HTTP + Socket.IO + graceful shutdown)
prisma/
├── schema.prisma
└── seed.ts
```

Controllers stay thin. Business logic lives in services. All database
access goes through Prisma.

## Local Setup

**Prerequisites:** Node.js 20+, a PostgreSQL database (local or hosted), and
a Google OAuth Client ID (for Google Sign-In).

```bash
npm install
```

Copy the environment template and fill in real values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on locally (Render sets this itself in production). |
| `NODE_ENV` | `development` \| `test` \| `production`. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `FRONTEND_URL` | The deployed (or local) frontend origin — used for CORS and cookie settings. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From your Google Cloud OAuth credentials. Only the Client ID is used for ID-token verification; the secret is included for completeness/future flows. |
| `JWT_SECRET` | A long, random string (32+ chars) used to sign application JWTs. |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d`. |
| `GAME_API_CLIENT_ID` / `GAME_API_CLIENT_SECRET` | IGDB (Twitch) API credentials for the game catalogue provider. |

Generate the Prisma Client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Seed the database with a starter game catalogue (real titles, no
fabricated cover art — real artwork populates the first time each game is
looked up through the catalogue provider):

```bash
npm run seed
```

Start the dev server (auto-reloads on file changes):

```bash
npm run dev
```

The API is now available at `http://localhost:5000/api`, and the health
check at `http://localhost:5000/health`.

## Testing

```bash
npm test
```

Tests cover the core business rules from the spec (duplicate-game
prevention, achievement-total validation, ownership checks, one-to-one
conversation rules, message persistence order, unauthorized-request
rejection, Google-token verification, etc.) using Vitest with a mocked
Prisma client — no real database is required to run the suite. This is a
deliberate choice: it keeps the tests fast and portable, at the cost of
not catching real SQL/constraint-level issues, which is what
`prisma migrate dev` + manual/integration testing against a real Postgres
instance is for.

## Production Build

```bash
npm run build   # tsc compile + prisma generate
npm start        # runs dist/server.js
```

`npm run build` runs `prisma generate` as part of the build step so the
Prisma Client is always in sync with `schema.prisma` before compiling.
`postinstall` also runs `prisma generate`, so a plain `npm install` on a
fresh clone (e.g. during a Render build) is enough to prepare the client.

## Deploying to Render

1. Create a new **Web Service** on Render, pointing at this repository's
   `backend/` directory (or the repo root, if the backend is the whole repo).
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. Add all variables from `.env.example` under Render's **Environment**
   tab, with real values. `PORT` does not need to be set — Render injects
   it automatically, and the server reads `process.env.PORT`.
5. Provision a PostgreSQL database (Render Postgres, or any managed
   Postgres) and set `DATABASE_URL` to its connection string.
6. After the first deploy, run migrations against the production database:
   ```bash
   npx prisma migrate deploy
   ```
   (Render supports running this as a one-off job, or as part of a
   release/build hook.)
7. Point `FRONTEND_URL` at your deployed Vercel domain — CORS only allows
   this exact origin, both for REST and Socket.IO.
8. Render will use `GET /health` for health checks automatically once
   configured in the service settings.

Your backend will be reachable at:

```text
https://YOUR-RENDER-BACKEND.onrender.com
```

## Connecting the Vercel Frontend

In the frontend's environment variables:

```env
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-BACKEND.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://YOUR-RENDER-BACKEND.onrender.com
```

The frontend should send the application JWT either via the
`Authorization: Bearer <token>` header, or rely on the httpOnly
`gamerfolio_token` cookie set automatically by `POST /api/auth/google`
(the API supports both — see `src/middleware/auth.middleware.ts`).

For Socket.IO, pass the same JWT in the client's connection options:

```ts
io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  auth: { token: appJwt },
});
```

## API Documentation

See [`API.md`](./API.md) for the full endpoint reference (method, auth
requirement, request/response shape, and socket events).

## Design Notes / Known Trade-offs

- **JWT "logout" is client-side only.** Tokens are stateless for V1 —
  `POST /api/auth/logout` clears the auth cookie, but a Bearer token used
  directly against the API remains valid until it naturally expires. If
  hard revocation is needed later, swap in a short-lived access token +
  refresh token pair with a server-side revocation/allow-list.
- **Presence is in-memory and per-process.** Fine for a single Render
  instance. If the app ever needs multiple instances, presence (and
  Socket.IO's adapter) would need to move to Redis pub/sub — intentionally
  out of scope for V1 per the project's "keep it simple" directive.
- **The game catalogue is a cache, not a mirror.** `Game` rows are
  created/updated lazily the first time a title is searched or looked up,
  via `gameProvider.service.ts` (IGDB). This keeps the provider fully
  abstracted — swapping providers later means editing one file.
