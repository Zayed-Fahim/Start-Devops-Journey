# User Management Dashboard

A deliberately small product used as a vehicle for learning DevOps and DevSecOps. The app
is the excuse; the infrastructure and the security model are the lesson.

**Stack:** Next.js 15 (App Router, Tailwind v4) → Express 4 + Prisma 6 → PostgreSQL 17
(hosted on Supabase)

Design decisions and their rationale live in [DESIGN.md](DESIGN.md). This file is the
operating manual.

---

## Division of labour

| Area                                                    | Who writes it    |
| ------------------------------------------------------- | ---------------- |
| `backend/` — API, auth, Prisma schema, migrations, seed | done             |
| `frontend/` — dashboard and auth UI                     | done             |
| `docker-compose.yaml`, Dockerfiles, CI                  | **you**, by hand |

There is currently no Compose file or Dockerfile in the repo — they were removed
deliberately so they can be rewritten from scratch. Both apps run directly on the host
today. Recover the old versions any time with `git show c946409:docker-compose.yaml`.

---

## Quick start

```bash
pnpm install && pnpm --dir backend install && pnpm --dir frontend install
```

Create `backend/.env` (see [Environment variables](#environment-variables)) and
`frontend/.env.local`, then:

```bash
pnpm --dir backend run db:migrate
```

Two terminals:

```bash
pnpm --dir backend run dev
```

```bash
pnpm --dir frontend run dev
```

Open **http://localhost:3000**. Backend is on **:5000**.

### Your first account

There is no seeder. The database starts with the role and permission catalogue that the
migrations insert, and no users at all — so nothing creates an account for you and
nothing writes sample data into a database you might later point at something real.

Set both of these in `backend/.env` and the account is created on the next boot:

```
SUPER_ADMIN_EMAIL=you@example.com
SUPER_ADMIN_PASSWORD=<8-72 characters>
```

It is created only if the email is not already taken, so restarting is harmless. It is
also the one account `db:reset` and `db:clear --users` refuse to delete. Leave either
value empty and the bootstrap is skipped entirely.

Everyone after that registers through the UI, or is created by an admin from the users
page.

---

## Environment variables

### `backend/.env`

| Variable                   | Example                                    | Notes                                            |
| -------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `PORT`                     | `5000`                                     |                                                  |
| `NODE_ENV`                 | `development`                              | `production` hides error detail in 500 responses |
| `DB_HOST`                  | `aws-0-ap-northeast-2.pooler.supabase.com` | the **pooler**, not `db.<ref>.supabase.co`       |
| `DB_PORT`                  | `6543`                                     | transaction pooler; 5432 is the session pooler   |
| `DB_NAME`                  | `postgres`                                 |                                                  |
| `DB_USER`                  | `postgres.<project-ref>`                   |                                                  |
| `DB_PASSWORD`              | —                                          | percent-encoded automatically                    |
| `SUPABASE_PROJECT_URL`     | —                                          | not used by Prisma                               |
| `SUPABASE_PUBLISHABLE_KEY` | —                                          | anon key — see the RLS note below                |
| `SUPABASE_SECRET_KEY`      | —                                          | never expose to a browser                        |
| `JWT_ACCESS_SECRET`        | 48+ random bytes                           | `openssl rand -base64 48`                        |
| `JWT_REFRESH_SECRET`       | 48+ random bytes                           | must differ from the access secret               |
| `ACCESS_TOKEN_TTL`         | `15m`                                      |                                                  |
| `REFRESH_TOKEN_TTL_DAYS`   | `7`                                        |                                                  |
| `REFRESH_GRACE_SECONDS`    | `15`                                       | replay window treated as a tab race, not theft   |
| `SESSION_MAX_PER_USER`     | `10`                                       | oldest sessions revoked past the cap             |
| `REFRESH_RETENTION_DAYS`   | `30`                                       | how long revoked rows survive `prune:sessions`   |
| `ARGON2_MEMORY_COST`       | `19456`                                    | KiB per hash — the expensive knob                |
| `ARGON2_TIME_COST`         | `2`                                        | passes over memory                               |
| `ARGON2_PARALLELISM`       | `1`                                        | lanes                                            |
| `MAX_FAILED_LOGINS`        | `5`                                        | consecutive failures before lockout              |
| `LOCKOUT_MINUTES`          | `15`                                       | lockout duration                                 |
| `LOG_LEVEL`                | `info`                                     | pino level; `silent` turns logging off           |
| `DB_POOL_MAX`              | `10`                                       | node-postgres pool size for the driver adapter   |
| `CORS_ORIGIN`              | `http://localhost:3000`                    | comma-separated for several                      |
| `SUPER_ADMIN_EMAIL`        | —                                          | blank disables the bootstrap                     |
| `SUPER_ADMIN_PASSWORD`     | —                                          | 8-72 characters                                  |
| `SUPER_ADMIN_NAME`         | `Super Admin`                              |                                                  |
| `SUPER_ADMIN_ROLE`         | `ADMIN`                                    | looked up in the `roles` table                   |
| `HEALTHCHECK_TIMEOUT_MS`   | `3000`                                     | not zod-validated; used by `healthcheck.js`      |

Every key is listed in `.env.example` with no comments; a bare `KEY=` is read as unset,
so blank lines fall back to the defaults above rather than failing validation.

`src/lib/env.js` validates all of this with zod at boot and **exits** if anything is
missing — a container that refuses to start is a visible problem; one that starts and
500s on a single endpoint is a silent one.

It also builds the two connection strings from the `DB_*` parts:

- **pooled** (`:6543` + `pgbouncer=true&connection_limit=1`) — for the app
- **direct** (`:5432`, session mode) — for migrations, which cannot run through a
  transaction pooler

Both get `connect_timeout=30`. Supabase's pooler cold-starts slower than Prisma's
default, which otherwise shows up as intermittent `P1001 can't reach database server`
on the first query of a fresh process. If you see that, it is almost never a wrong
password — check with the probe in [Troubleshooting](#troubleshooting).

> ⚠️ **`db.<project-ref>.supabase.co` is IPv6-only.** On an IPv4-only network it is
> simply unreachable. Use the pooler hostname.

### `frontend/.env.local`

| Variable              | Example                 | Notes                                   |
| --------------------- | ----------------------- | --------------------------------------- |
| `INTERNAL_API_URL`    | `http://localhost:5000` | server-side, read at **runtime**        |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` | browser-side, inlined at **build time** |

### The two-URL problem

Identical today because everything is on localhost, but they must stay separate — the
moment the backend moves into a container they diverge:

| Caller           | Runs where                            | Would use               |
| ---------------- | ------------------------------------- | ----------------------- |
| Server Component | inside the frontend process/container | `http://backend:5000`   |
| Client Component | in the user's browser                 | `http://localhost:5000` |

One variable cannot serve both: the browser given `backend:5000` gets
`ERR_NAME_NOT_RESOLVED`; the server given `localhost:5000` inside a container gets
`ECONNREFUSED`, because there `localhost` is the frontend itself.

`NEXT_PUBLIC_*` is **inlined into the JavaScript bundle at build time** and shipped to
every visitor — never put a secret behind that prefix.
[`api-server.ts`](frontend/src/lib/api-server.ts) imports `server-only`, so importing it
from a Client Component fails the _build_ rather than leaking a hostname.

---

## Commands

### Backend

| Command                                       | Does                                                       |
| --------------------------------------------- | ---------------------------------------------------------- |
| `pnpm run dev`                                | generate client → apply migrations → nodemon               |
| `pnpm run db:migrate`                         | apply committed migrations                                 |
| `pnpm run db:migrate:dev --name what_changed` | author a new migration                                     |
| `pnpm run db:status`                          | what has and has not been applied                          |
| `pnpm run db:studio`                          | Prisma's database browser                                  |
| `pnpm run db:reset`                           | delete transactional rows, keeping the catalogue           |
| `pnpm run db:clear -- --list`                 | row counts per table; `--table=`, `--users`, `--dry-run`   |
| `pnpm run prune:sessions`                     | enforce the session cap and delete expired refresh rows    |
| `pnpm test`                                   | integration suites against a running stack                 |
| `pnpm run lint`                               | eslint (airbnb)                                            |

All `db:*` scripts route through `scripts/with-db-url.js`, which injects the computed
connection strings — the Prisma binary reads `.env` directly and would not otherwise see
values built in JavaScript.

### Frontend

| Command                           | Does                                            |
| --------------------------------- | ----------------------------------------------- |
| `pnpm run dev`                    | dev server on :3000                             |
| `pnpm run build`                  | production build (emits `.next/standalone`)     |
| `node .next/standalone/server.js` | run the standalone build — **not** `next start` |

### Repo root

`pnpm run format`, `pnpm run lint`. Husky runs lint-staged on commit and commitlint on
the message — conventional commits, lower-case subject, ≤100 characters.

---

## API

Base path `/api`. Full contract in [DESIGN.md §7](DESIGN.md).

| Method   | Path                 | Auth                                |
| -------- | -------------------- | ----------------------------------- |
| `POST`   | `/api/auth/register` | public                              |
| `POST`   | `/api/auth/login`    | public                              |
| `POST`   | `/api/auth/refresh`  | refresh cookie                      |
| `POST`   | `/api/auth/logout`   | session + CSRF                      |
| `GET`    | `/api/auth/me`       | session                             |
| `GET`    | `/api/users`         | session                             |
| `GET`    | `/api/users/:id`     | session                             |
| `GET`    | `/api/users/stats`   | session                             |
| `POST`   | `/api/users`         | **ADMIN** + CSRF                    |
| `PATCH`  | `/api/users/:id`     | **ADMIN** + CSRF                    |
| `DELETE` | `/api/users/:id`     | **ADMIN** + CSRF                    |
| `GET`    | `/healthz`           | public — liveness, **no DB call**   |
| `GET`    | `/readyz`            | public — readiness, runs `SELECT 1` |

**Query params on `/api/users`:** `page` (1–1,000,000), `limit` (1–100, capped not
rejected), `search` (case-insensitive on name or email, LIKE metacharacters escaped),
`role`, `status`, `sortBy` (`name|email|role|status|createdAt`), `order`.

**Every error, every endpoint, one shape:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [{ "field": "email", "message": "..." }]
  }
}
```

`400` validation · `401` no/expired session · `403` forbidden or bad CSRF · `404` missing
· `409` duplicate email · `423` locked · `429` rate limited · `503` database unavailable.

The `password` field is **never** returned — excluded by the Prisma `select`, so the hash
never enters the Node process at all.

### Why `/healthz` and `/readyz` are separate

|               | `/healthz`              | `/readyz`                           |
| ------------- | ----------------------- | ----------------------------------- |
| Answers       | "is the process alive?" | "can it serve traffic?"             |
| Touches DB    | no                      | yes                                 |
| Failure means | restart me              | stop sending traffic, don't restart |

If liveness checked the database, one brief blip would restart every backend instance
simultaneously — turning a five-second degradation into a full cold start, exactly when
the database is already struggling. Verified: with the DB unreachable, `/healthz` returns
200 while `/readyz` returns 503.

---

## Security model

Built by hand rather than delegated, because the mechanics are the point.

- **Access token**: 15-minute HS256 JWT in an `httpOnly` cookie — no script can read it
- **Refresh token**: opaque 384-bit random, stored only as an HMAC-SHA256 digest, so a
  database leak yields no usable sessions
- **Rotation with reuse detection**: every refresh issues a new token and revokes the
  old; replaying a revoked token revokes the whole family, because two parties holding
  one secret means it was stolen
- **CSRF**: double-submit token, cookie vs `X-CSRF-Token` header, `timingSafeEqual`
- **No user enumeration**: an argon2 verify against a dummy hash runs even for unknown
  emails, so response time does not reveal which addresses exist
- **Lockout**: 5 failed logins → 15 minutes
- **Rate limits**: 10 logins / 15 min, 5 registrations / hour, 300 requests / min
- **Passwords**: Argon2id at the OWASP floor — 19 MiB, two passes, one lane — 6–32
  characters (self-registration also requires upper, lower and a digit). Memory is the
  point: bcrypt needs almost none and so parallelises cheaply on a GPU, while argon2id
  makes an attacker buy RAM per guess. Raising `ARGON2_*` migrates accounts as they sign
  in, because a correct password whose digest is below the current parameters is
  rehashed on the spot
- **RLS enabled on every table** — see below
- helmet, and CORS as an origin allowlist with credentials (never `*`)

### Row Level Security is not optional here

Supabase serves PostgREST over the same database using your publishable (anon) key. With
RLS disabled, that key reads and writes `users` and `refresh_tokens` **directly** —
password hashes and refresh digests included — bypassing the API, its CSRF check and its
role gate entirely.

RLS is enabled by migration `20260814190000_enable_row_level_security`, with **no
policies**, which denies anon access outright. The backend connects as the table owner
and is exempt from RLS unless `FORCE ROW LEVEL SECURITY` is set.

> "My API is secure" and "my data is secure" are different claims. This is the gap
> between them.

---

## How not to lose your data

The database is hosted, which changes the failure mode: you can no longer wipe it by
accident with `docker compose down -v`, but you also can no longer fix anything by
deleting it.

### Back up before every migration

Supabase takes automatic backups on paid plans; on free, take your own:

```bash
pg_dump "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME" --clean --if-exists --no-owner --no-privileges > backups/$(date +%Y%m%d-%H%M%S).sql
```

Use port **5432** (session pooler) — `pg_dump` cannot run through the transaction pooler.
`./backups/` is gitignored.

Not because migrations usually fail, but because the one time it does, it fails against
data you cared about.

### Migrations are forward-only

Schema changes ship as SQL under `backend/prisma/migrations/`, committed to git, applied
with `db:migrate`.

- **Never `prisma db push`** against a database with data. It reconciles the schema by
  whatever means necessary, including dropping columns, and leaves no artifact — nothing
  to review, replay, or roll forward from.
- Made a mistake? Write the **next** migration that fixes it. Never edit one that has run.
- `migrate deploy` never resets and never prompts. `migrate dev` may offer to reset —
  never accept that on a database whose data you want.

> If you hit **P3005 "database schema is not empty"**, that is the guard working: Prisma
> refuses to migrate a database it did not create. Baseline instead — apply the SQL by
> hand in a transaction, then `prisma migrate resolve --applied <name>`. It is not a
> reason to wipe anything.

---

## Troubleshooting

**`P1001 can't reach database server`** — usually a cold pooler, not a bad password.
Confirm the server is actually answering before touching credentials:

```bash
node -e 'const n=require("net"),s=n.connect({host:process.argv[1],port:5432});s.on("connect",()=>{const b=Buffer.alloc(8);b.writeInt32BE(8,0);b.writeInt32BE(80877103,4);s.write(b)});s.once("data",d=>{console.log(d.toString("latin1")[0]==="S"?"postgres is answering":"unexpected");s.destroy()});s.on("error",e=>console.log("error",e.code))' aws-0-ap-northeast-2.pooler.supabase.com
```

`postgres is answering` means the host, port and network are fine — retry, or raise
`connect_timeout`.

**`ERR_NAME_NOT_RESOLVED` in the browser** — `NEXT_PUBLIC_API_URL` is pointing at a
container hostname. See [the two-URL problem](#the-two-url-problem).

**403 on every write** — the CSRF cookie is missing. It is set at login; sign out and in
again.

---

## Production vs this setup

|                       | Here                     | Production                                                |
| --------------------- | ------------------------ | --------------------------------------------------------- |
| Secrets               | plaintext `backend/.env` | secret manager, generated and rotated                     |
| `SUPABASE_SECRET_KEY` | in the same file         | separate, server-only, never in a bundle                  |
| Backups               | manual `pg_dump`         | scheduled, off-host, and **restore-tested**               |
| Migrations            | run on app start         | separate job, _before_ the new version rolls out          |
| Rate limiting         | in-memory, per process   | shared store (Redis), or at the edge                      |
| Lockout counter       | database column          | fine, but pair it with alerting                           |
| CORS                  | `http://localhost:3000`  | a real domain                                             |
| RLS                   | enabled, no policies     | enabled, with policies, if clients ever talk to PostgREST |
