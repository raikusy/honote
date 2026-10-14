# Honote

Honote is a note-taking app with private notes, public posts, and role-based administration. A visitor can register, sign in, and read posts. A user keeps their own notes, publishes posts, and edits their profile. An admin provisions users, resets passwords, removes users, reads every note, and sees which users share an interest.

The web app is a thin client. The contract is one oRPC router, exposed as RPC and as REST.

## Features

- Register and sign in with email and password. Passwords are hashed with Argon2id. Sessions are HS256 JWTs (`access` or `password_change`).
- A one-time password opens only the password-replacement screen. Access tokens last one hour. Password-change tokens last 15 minutes. Password changes, role changes, and account deletion invalidate older tokens.
- Users create, list, open, edit, and delete their own notes. Another person's note is not found, including for an admin on the user note routes.
- Anyone can read public posts. Only the author can edit or delete a post. A display name links to that user's posts.
- Admins list, create, update, and delete users, reset passwords, list every note read-only, and page interest memberships.
- Lists use `page` and `limit` (default 1 and 20, maximum 100).
- Login and registration are rate limited in memory.
- Startup creates the first admin from environment variables when that email is absent.

## Highlights

- One router in `packages/api` serves both `/api/v1/rpc` and REST under `/api/v1`. The OpenAPI reference is `/api/v1/api-reference`. `GET /` is process liveness only.
- Bearer checks live in one oRPC middleware. Hono's JWT helpers sign and verify tokens.
- Interest memberships are one `User` aggregation (`$unwind`, `$group`, `$facet`). Posts for one user are one aggregation with `$lookup`.
- Indexes are declared with `schema.index` only: unique email and created-time order on users; owner and created-time order on notes; author and created-time order on posts. Single-document reads use MongoDB's `_id` index.
- Deleting a user, or demoting or deleting the last admin, runs in one transaction. MongoDB must be a replica set.

## Codebase

```text
honote/
├── apps/
│   ├── web/                 # React client (Vite, port 3001)
│   │   └── src/
│   │       ├── routes/      # TanStack Router file routes
│   │       ├── components/  # Header, forms, post lists
│   │       ├── lib/         # Session, access gates, paging
│   │       └── utils/orpc.ts
│   └── server/              # Hono process (port 3000)
│       └── src/
│           ├── index.ts     # CORS, RPC, and OpenAPI handlers
│           ├── services.ts  # Mongo connection and admin seed
│           ├── seed-admin.ts
│           └── seed.ts      # Demo data (wipes existing documents)
├── packages/
│   ├── api/                 # Router, Zod schemas, auth, notes, posts, aggregations
│   │   └── src/routers/     # auth, profile, notes, posts, admin users, admin notes
│   ├── db/                  # Mongoose models and indexes (user, note, post)
│   ├── ui/                  # Shared UI primitives and global styles
│   └── config/              # Shared TypeScript config
├── docker/                  # Replica-set entrypoint and healthcheck
└── docker-compose.yml
```

Web routes follow the files in `apps/web/src/routes`: `/` posts, `/posts/$postId`, `/users/$userId/posts`, `/login`, `/register`, `/password`, `/profile`, `/notes`, `/my-posts`, and `/admin/users`, `/admin/notes`, `/admin/interests`.

## Getting started

Requires [Bun](https://bun.sh) 1.4.3.

```bash
bun install
```

Copy each `.env.schema` into a sibling `.env` and fill the secrets. Required server values:

| Variable             | Purpose                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`       | MongoDB URI. Use a replica set (`replicaSet=rs0`).                                   |
| `JWT_SECRET`         | HS256 secret, at least 32 characters.                                                |
| `CORS_ORIGIN`        | Web origin, `http://localhost:3001` in local dev.                                    |
| `ADMIN_EMAIL`        | First admin email. Created only if that email is absent.                             |
| `ADMIN_DISPLAY_NAME` | First admin display name.                                                            |
| `ADMIN_PASSWORD`     | First admin password, 12–128 characters. A normal password, not a one-time password. |

The web app needs `VITE_SERVER_URL` (`http://localhost:3000` in local dev).

Start MongoDB as a single-node replica set, then the apps:

```bash
bun run db:start
bun run dev
```

Web: [http://localhost:3001](http://localhost:3001). API: [http://localhost:3000](http://localhost:3000). Reference: [http://localhost:3000/api/v1/api-reference](http://localhost:3000/api/v1/api-reference).

Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

`bun run db:seed` deletes every user, note, and post, then inserts 20 users, 5 admins, 100 notes, and 100 posts. Their password is `seed-password-1`. Restart the server afterward if you still want the configured admin. Admins can run the same replacement from `/admin/seed`.

## Scripts

From the repo root:

| Script                 | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `bun run dev`          | Web and server in development                           |
| `bun run dev:web`      | Web only                                                |
| `bun run dev:server`   | Server only (`bun --hot`)                               |
| `bun run build`        | Build every package                                     |
| `bun run check-types`  | Typecheck every package                                 |
| `bun run check`        | Oxlint and Oxfmt                                        |
| `bun run env:generate` | Regenerate Varlock `env.ts` files after a schema change |
| `bun run db:start`     | MongoDB in the background                               |
| `bun run db:watch`     | MongoDB in the foreground                               |
| `bun run db:stop`      | Stop MongoDB                                            |
| `bun run db:down`      | Stop and remove the MongoDB container                   |
| `bun run db:seed`      | Replace database contents with demo data                |
| `bun run docker:build` | Build the Compose images                                |
| `bun run docker:up`    | Build and start web, server, and MongoDB                |
| `bun run docker:logs`  | Follow Compose logs                                     |
| `bun run docker:down`  | Stop the Compose stack                                  |

`apps/server` also has `start` (`bun run dist/index.mjs` after a build) and `compile` (a standalone Bun binary).

Lefthook runs Oxlint and Oxfmt on staged files before each commit.

## Docker

`docker-compose.yml` runs the web app on port 3001, the API on port 3000, and MongoDB 8 as replica set `rs0`. The database user is `root`. The password defaults to `password` (`MONGO_PASSWORD` overrides it).

```bash
bun run docker:up
```

Container env files are `apps/web/.env` and `apps/server/.env`. Compose overrides `CORS_ORIGIN` and `DATABASE_URL` on the server so it reaches the `mongodb` service.

## Environment

Each app owns a `.env.schema`. `bun install` runs Varlock codegen. After a schema edit, run `bun run env:generate`. Commit schemas. Keep `.env` files untracked.

Import the generated `ENV` accessor from the owning app. `packages/db` does not load secrets itself. The server passes the database URL in.

Bun's automatic env loading is off (`bunfig.toml`). The server loads Varlock from `apps/server/src/env.server.ts`. Run `db:seed` from the repo root so that script can change into `apps/server` and load that schema.
