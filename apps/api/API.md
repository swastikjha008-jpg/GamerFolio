# GamerFolio Backend — API Reference

Base URL (local): `http://localhost:5000/api`
Base URL (production): `https://YOUR-RENDER-BACKEND.onrender.com/api`

All responses share a consistent envelope:

```json
// Success
{ "success": true, "data": { ... }, "message": "optional", "meta": { "...pagination, optional" } }

// Error
{ "success": false, "message": "Human-readable error", "errors": { "field": ["reason"] } }
```

**Authentication** is via a JWT, sent either as `Authorization: Bearer <token>`
or the httpOnly `gamerfolio_token` cookie (set automatically by
`POST /auth/google`). Endpoints marked 🔒 require a valid token.

**Pagination**: any endpoint marked 📄 accepts `?page=1&limit=20` (limit is
capped at 50) and returns a `meta` object:
`{ page, limit, total, totalPages, hasNextPage, hasPrevPage }`.

---

## Auth

### `POST /auth/google`
Verifies a Google ID token, finds or creates the corresponding user, and
returns an application JWT.

- **Auth:** none
- **Body:**
  ```json
  { "credential": "<Google ID token from Google Sign-In>" }
  ```
- **Response `200`:**
  ```json
  { "success": true, "data": { "token": "<jwt>", "user": { "id": "...", "username": "...", "...": "..." } } }
  ```
- **Errors:** `401` invalid/unverified Google credential · `409` email already registered under a different Google account

### `GET /auth/me` 🔒
Returns the currently authenticated user.

- **Response `200`:** `{ "data": { "id": "...", "email": "...", "username": "...", "...": "..." } }`
- **Errors:** `401` missing/invalid/expired token

### `POST /auth/logout` 🔒
Clears the auth cookie. See [Design Notes](./README.md#design-notes--known-trade-offs) regarding stateless JWTs.

- **Response `200`:** `{ "data": null, "message": "Logged out" }`

---

## Users

### `GET /users/me` 🔒
Returns the authenticated user's full profile, including basic stats.

- **Response `200`:** `{ "data": { ...user, "stats": { totalGames, currentlyPlaying, completed, favorites, hoursPlayed } } }`

### `PATCH /users/me` 🔒
Updates the authenticated user's profile.

- **Body** (all optional, at least one required):
  ```json
  {
    "displayName": "string (1-50 chars)",
    "username": "string (3-30 chars, letters/numbers/underscore/dot)",
    "bio": "string (≤280 chars) | null",
    "avatarUrl": "url | null",
    "steamId": "string | null",
    "epicGamesId": "string | null"
  }
  ```
- **Errors:** `409` username already taken · `422` validation failure

### `GET /users/me/stats` 🔒
Returns just the stats object (total games, currently playing, completed, favorites, hours played).

### `GET /users/search` 📄
Searches usernames/display names (case-insensitive, partial match).

- **Query:** `?q=<term>&page=&limit=`
- **Response `200`:** array of public profiles + `meta`

### `GET /users/:username`
Returns a public profile. Never includes email, googleId, or other private fields.

- **Errors:** `404` user not found

---

## Games (catalogue)

### `GET /games/search`
Searches the external game provider (IGDB) live, and caches normalized
results into the local catalogue.

- **Query:** `?q=<term>&limit=` (limit capped at 50, default 20)
- **Response `200`:** array of normalized games:
  ```json
  { "id": "...", "externalId": "...", "title": "...", "slug": "...", "coverUrl": "...", "releaseDate": "...", "genres": ["..."], "platforms": ["..."] }
  ```
- **Errors:** `400` provider not configured / provider request failed

### `GET /games` 📄
Lists games already cached in the local catalogue (no external call — fast).

### `GET /games/:id`
Fetches one game by local ID (or external provider ID as a fallback,
fetching + caching from the provider if not seen locally yet).

- **Errors:** `404` game not found anywhere

---

## My Games (library) — all require 🔒

Mounted at `/me/games`.

### `POST /me/games`
Adds a game to the authenticated user's library. Creates a `GAME_ADDED`
activity entry.

- **Body:**
  ```json
  {
    "gameId": "required — local catalogue Game id",
    "status": "PLAYING | PLAYED | COMPLETED | WATCHED | DROPPED | WISHLIST",
    "hoursPlayed": "number ≥ 0",
    "achievementsUnlocked": "int ≥ 0",
    "achievementsTotal": "int ≥ 0 | null",
    "rating": "int 1-5 | null",
    "favorite": "boolean",
    "notes": "string ≤1000 chars | null"
  }
  ```
  Only `gameId` is required; all tracking fields are optional and default
  sensibly (`status` defaults to `WISHLIST`, `hoursPlayed` to `0`, etc.).
- **Errors:** `409` game already in library · `422` `achievementsUnlocked > achievementsTotal`, rating out of range, negative hours, etc.

### `GET /me/games` 📄
Lists the authenticated user's library.

- **Query:** `?status=&favorite=true|false&page=&limit=`

### `GET /me/games/:gameId`
Returns one library entry (must be owned by the authenticated user).

- **Errors:** `404` not in this user's library

### `PATCH /me/games/:gameId`
Updates a library entry. Same field set as `POST`, all optional (at least
one required). Setting `status` to `COMPLETED` logs a `GAME_COMPLETED`
activity instead of `GAME_UPDATED`.

- **Errors:** `404` not owned · `400` achievement-total violated after merge

### `DELETE /me/games/:gameId`
Removes a game from the library. Logs a `GAME_REMOVED` activity.

- **Errors:** `404` not owned

---

## Activity — 🔒

### `GET /me/activity` 📄
Returns the authenticated user's auto-generated activity timeline (most
recent first). Activities are never created directly by clients — only as
a side effect of library actions above.

- **Response `200`:** array of `{ id, type, userGameId, metadata, createdAt, userGame }`

---

## Conversations & Messages — all require 🔒

Mounted at `/conversations`. One-to-one only; no group chats.

### `GET /conversations` 📄
Lists the authenticated user's conversations, most recently active first,
each including its two participants' public info and the latest message.

### `POST /conversations`
Creates (or returns the existing) one-to-one conversation with another user.

- **Body:** `{ "userId": "the other user's id" }`
- **Errors:** `400` cannot message yourself · `404` other user not found

### `GET /conversations/:id`
Returns one conversation's metadata + participants.

- **Errors:** `403` not a participant · `404` not found

### `GET /conversations/:id/messages` 📄
Returns messages for a conversation, most recent first.

- **Errors:** `403` not a participant · `404` not found

> Sending a message is done over **Socket.IO** (`send_message`), not REST —
> see below. This keeps realtime delivery and persistence in one atomic
> path instead of two separate ones the frontend would have to keep in sync.

---

## Realtime — Socket.IO

Connect with the same application JWT:

```ts
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  auth: { token: appJwt },
});
```

Unauthenticated connections are rejected before `connect` fires.

### Client → Server events

| Event | Payload | Behavior |
|---|---|---|
| `join_conversation` | `{ conversationId }` (+ optional ack callback) | Joins the socket to that conversation's room, after verifying membership. Ack: `{ success, message? }` |
| `send_message` | `{ conversationId, content }` (+ optional ack callback) | Persists the message to PostgreSQL **first**, then emits `message_sent` back to the sending connection, and `message_received` to every *other* connected device of every participant (the sender's own other open tabs included). Ack: `{ success, message?, message: <persisted message> }` |
| `typing_start` | `{ conversationId }` | Broadcasts `user_typing` to others in the room |
| `typing_stop` | `{ conversationId }` | Broadcasts `user_stopped_typing` to others in the room |

### Server → Client events

| Event | Payload | When |
|---|---|---|
| `message_received` | persisted message object | Delivered once to every *other* connected device across all participants (the sender's own other tabs included) — never to the same connection that sent it |
| `message_sent` | persisted message object | Delivery confirmation back to the exact sending connection |
| `user_typing` | `{ conversationId, userId }` | Another participant started typing |
| `user_stopped_typing` | `{ conversationId, userId }` | Another participant stopped typing |
| `user_online` | `{ userId }` | Broadcast to everyone when a user's first socket connects |
| `user_offline` | `{ userId }` | Broadcast to everyone when a user's last socket disconnects |

Presence (`user_online`/`user_offline`) is tracked in-memory per Render
process — see the README's design notes.

---

## Health

### `GET /health`
Used by Render's health checks.

```json
{ "status": "ok" }
```
