# GamerFolio

GamerFolio is a polished gaming identity and library template in a pnpm monorepo.
The frontend is built with Next.js 14 and the existing Express, Prisma, PostgreSQL,
and Socket.IO backend lives beside it in `apps/api`.

This repository is safe to use as a GitHub template. Private `.env` files are
ignored and never belong in a commit. Copy the example files and add your own
credentials locally or in your hosting provider's environment settings.

## Local development

Requirements: Node.js 20+ and pnpm 11.

```bash
pnpm install
copy apps\web\.env.example apps\web\.env.local
copy apps\api\.env.local.example apps\api\.env
pnpm dev:api
pnpm dev:web
```

The web app runs at `http://localhost:3000` and the API at `http://localhost:5000`.
The frontend runs at `http://localhost:3000` and the API at `http://localhost:5000`.
The local example uses a local PostgreSQL database and does not require IGDB keys.
The frontend falls back to a demo session when no Google credential is supplied,
which keeps the UI usable before OAuth configuration is complete.

## Environment variables

Required for a real deployment:

```text
DATABASE_URL
FRONTEND_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
JWT_SECRET
```

`GAME_API_CLIENT_ID` and `GAME_API_CLIENT_SECRET` are optional. Add Twitch/IGDB
application credentials when you want the API to search and cache a larger live
catalogue. The frontend includes real fallback catalogue data for local demos.

Generate a secure JWT secret without installing another tool:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never put real credentials in `README.md`, `.env.example`, source files, or a
GitHub commit. Add them to Vercel, Render, Railway, or your chosen host instead.

## Validation

```bash
pnpm --filter @gamerfolio/web lint
pnpm build:web
pnpm build:api
```

## Deployment

### Frontend: Vercel

Create a Vercel project with the repository root set to `apps/web`. Use the
Next.js preset and add these environment variables:

```text
NEXT_PUBLIC_API_URL=https://api.example.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.example.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Vercel detects the Next.js build automatically. The API must allow the deployed
frontend origin in its CORS configuration and the Google OAuth client must include
the production origin.

### API: Render, Railway, or a Node host

Use `apps/api` as the service root. The commands are:

```bash
pnpm install --frozen-lockfile
pnpm --filter @gamerfolio/api build
pnpm --filter @gamerfolio/api start
```

Provide the variables documented in `apps/api/.env.example`, including a hosted
PostgreSQL `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
and the deployed web URL in `FRONTEND_URL`. Run Prisma migrations during release
with `pnpm --filter @gamerfolio/api prisma:migrate:deploy`.

## GitHub template checklist

1. Create a repository from this folder.
2. Confirm `.env` and `.env.local` are ignored before the first commit.
3. Add deployment environment variables in the hosting dashboards.
4. Configure the Google OAuth client with both local and production origins.
5. Run the validation commands before opening a pull request.

## Structure

```text
apps/web   Next.js frontend, pages, components, services, and mock fallback data
apps/api   Express API, Prisma schema, database migrations, and Socket.IO server
```

The frontend services are deliberately separated from the views, so switching the
remaining demo fallbacks to live API data does not require redesigning the UI.
