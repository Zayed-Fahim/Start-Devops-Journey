# User Management Dashboard

A deliberately small product used as a vehicle for learning DevOps. The app is the
excuse; the infrastructure is the lesson.

**Stack:** Next.js 15 (App Router, Tailwind v4) → Express 4 + Prisma 6 → PostgreSQL 16

Design decisions and their rationale live in [DESIGN.md](DESIGN.md). This file is the
operating manual.

---

## Division of labour

| Area | Who writes it |
|---|---|
| `backend/` application code, Prisma schema, migrations, seed | done — see below |
| `frontend/` dashboard UI | done — see below |
| `docker-compose.yaml`, `backend/Dockerfile.*`, `frontend/Dockerfile.*` | **you**, by hand |

The Compose file is currently still the original MongoDB one. The application code is
already Postgres-only, so **the stack will not run end-to-end until you write the
`postgres` service**. [What you need to write](#what-you-need-to-write) lists exactly
what it must provide, and [Known bugs in the existing Dockerfiles](#known-bugs-in-the-existing-dockerfiles)
lists the traps waiting in the files you already have.

---

## Quick start

```bash
cp .env.example .env
cp backend/.env.example backend/.env.dev
cp frontend/.env.example frontend/.env.local
```

Then, once your Compose file defines `postgres`:

```bash
docker compose up -d --build
```

```bash
docker compose exec backend yarn seed
```

Open **http://localhost:3000** for the dashboard, **http://localhost:3001/api/users**
for the raw API.

### Running without Docker

Postgres in a container, apps on the host — useful while you are still writing the
Compose file:

```bash
docker run -d --name pg -e POSTGRES_USER=devops -e POSTGRES_PASSWORD=changeme_locally -e POSTGRES_DB=devops_journey -p 5432:5432 -v postgres_data:/var/lib/postgresql/data postgres:16-alpine
```

```bash
cd backend && yarn install && DATABASE_URL="postgresql://devops:changeme_locally@localhost:5432/devops_journey?schema=public" yarn dev
```

```bash
cd frontend && yarn install && INTERNAL_API_URL=http://localhost:3001 NEXT_PUBLIC_API_URL=http://localhost:3001 yarn dev
```

On the host both URLs are `localhost`. In Docker they differ — see below.

---

## The two-URL problem

The single most common Docker mistake in a Next.js stack. The frontend calls the backend
from **two different places**, and they do not share a DNS namespace.

| Caller | Runs where | Resolves `backend`? | Variable |
|---|---|---|---|
| Server Component | inside the `frontend` container | yes, via Docker DNS | `INTERNAL_API_URL=http://backend:3001` |
| Client Component | in the user's browser | **no** | `NEXT_PUBLIC_API_URL=http://localhost:3001` |

Use one variable for both and one caller always breaks:

- browser given `http://backend:3001` → `ERR_NAME_NOT_RESOLVED`
- server given `http://localhost:3001` → `ECONNREFUSED`, because inside the frontend
  container `localhost` *is* the frontend

They also differ in **when** they are read. `NEXT_PUBLIC_*` is inlined into the JS bundle
at **build time** and shipped to every visitor — never put a secret behind that prefix.
`INTERNAL_API_URL` is read at **runtime**, server-side only, and never leaves the
container.

Enforced in code: [`api-server.ts`](frontend/src/lib/api-server.ts) imports `server-only`,
so importing it from a Client Component fails the **build** rather than leaking a
container hostname to the browser.

---

## Environment variables

Two layers. Confusing them is why the original Compose file could not start.

### Layer 1 — root `.env` (Compose interpolation)

Read by the Docker CLI to substitute `${...}` in `docker-compose.yaml`. **Not**
automatically visible inside containers.

| Variable | Example | Notes |
|---|---|---|
| `NODE_VERSION` | `22-alpine` | build arg; pinned, never `latest` |
| `BACKEND_DOCKERFILE` | `Dockerfile.dev` | swap to `Dockerfile.prod` to test the prod image |
| `FRONTEND_DOCKERFILE` | `Dockerfile.dev` | |
| `BACKEND_ENV_FILE` | `./backend/.env.dev` | must exist or `docker compose config` fails |
| `FRONTEND_ENV_FILE` | `./frontend/.env.local` | must exist |
| `BACKEND_PORT` | `3001` | host-side mapping |
| `FRONTEND_PORT` | `3000` | host-side mapping |
| `POSTGRES_USER` | `devops` | read on **first boot only** |
| `POSTGRES_PASSWORD` | `changeme_locally` | read on **first boot only** |
| `POSTGRES_DB` | `devops_journey` | read on **first boot only** |
| `POSTGRES_PORT` | `5432` | host-side mapping |
| `ADMINER_PORT` | `8080` | database GUI |
| `MONGO_*`, `ME_CONFIG_*` | — | still referenced by the current Compose file; delete both blocks once it is rewritten |

> **First boot only** is not a footnote. The Postgres image runs `initdb` only against an
> empty data directory. Once `postgres_data` has a cluster in it, changing
> `POSTGRES_PASSWORD` in `.env` does **nothing** — the image skips initialisation
> entirely. Changing the password afterwards is an `ALTER USER` statement.

### Layer 2 — `backend/.env.dev` (container runtime)

Loaded into the container by `env_file:`; lands in `process.env`.

| Variable | Example | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `production` suppresses error detail in 500 responses |
| `PORT` | `3001` | read by the server; never hardcoded |
| `DATABASE_URL` | `postgresql://devops:changeme_locally@postgres:5432/devops_journey?schema=public` | host is the **service name**, not localhost |
| `CORS_ORIGIN` | `http://localhost:3000` | comma-separated for multiple; the **browser's** address |
| `BCRYPT_ROUNDS` | `10` | optional; each +1 doubles hashing time |

### Layer 2 — `frontend/.env.local`

| Variable | Example | Notes |
|---|---|---|
| `INTERNAL_API_URL` | `http://backend:3001` | server-side, runtime, Docker DNS |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | browser-side, **inlined at build time** |

All three files have a committed `.env.example`. Real `.env*` files are gitignored;
the `!.env.example` negations in [.gitignore](.gitignore) are what keep the templates
committable.

---

## Common commands

### Stack

```bash
docker compose up -d --build
```

```bash
docker compose ps
```

```bash
docker compose logs -f backend
```

```bash
docker compose down
```

### Database

```bash
docker compose exec postgres psql -U devops -d devops_journey
```

```bash
./scripts/backup.sh
```

```bash
./scripts/restore.sh
```

### Backend

| Command | Does |
|---|---|
| `yarn dev` | generate client → run migrations → nodemon |
| `yarn seed` | insert/refresh 25 sample users (idempotent) |
| `yarn migrate:dev --name what_changed` | author a new migration |
| `yarn migrate:deploy` | apply committed migrations (container start, CI, prod) |
| `yarn migrate:status` | what has and has not been applied |
| `yarn studio` | Prisma's database browser |

### Frontend

| Command | Does |
|---|---|
| `yarn dev` | dev server on :3000 |
| `yarn build` | production build (emits `.next/standalone`) |
| `node .next/standalone/server.js` | run the standalone build — **not** `yarn start` |

---

## API reference

Base path `/api`. Full contract in [DESIGN.md §7](DESIGN.md).

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/users` | `{ data, meta: { page, limit, total, totalPages } }` |
| `GET` | `/api/users/:id` | the bare user object |
| `POST` | `/api/users` | `201` + created user + `Location` header |
| `PATCH` | `/api/users/:id` | `200` + updated user |
| `DELETE` | `/api/users/:id` | `204`, no body |
| `GET` | `/api/users/stats` | `{ total, byRole, byStatus }` |
| `GET` | `/healthz` | liveness — process only, **no DB call** |
| `GET` | `/readyz` | readiness — runs `SELECT 1` |

**Query params on `/api/users`:** `page` (1–1,000,000), `limit` (1–100, capped not
rejected), `search` (case-insensitive, name or email), `role`, `status`,
`sortBy` (`name|email|role|status|createdAt`), `order` (`asc|desc`).

**Every error, every endpoint, one shape:**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "email", "message": "..." }] } }
```

`400` validation · `404` missing · `409` duplicate email · `503` database unavailable ·
`500` unhandled. The single envelope is why the frontend needs one error handler and one
field-mapper instead of a special case per endpoint.

The `password` field is **never** returned. It is excluded by the Prisma `select`, so the
hash never enters the Node process at all — not filtered out on the way back.

### Why `/healthz` and `/readyz` are separate

| | `/healthz` (liveness) | `/readyz` (readiness) |
|---|---|---|
| Answers | "is the process alive?" | "can it serve traffic?" |
| Touches the DB | no | yes |
| Failure means | restart me | stop sending traffic, don't restart |

Conflating them is a classic outage amplifier: if liveness checked Postgres, a five-second
database blip would fail liveness on every backend container simultaneously and the
orchestrator would restart all of them at once — turning a brief degradation into a full
cold start, exactly when the database is already struggling.

Verified behaviour with the database unreachable: `/healthz` → `200`, `/readyz` → `503`,
`/api/users` → `503 DATABASE_UNAVAILABLE`.

---

## How not to lose your data

Postgres data lives in the named volume `postgres_data`, mounted at
`/var/lib/postgresql/data`. It survives `docker compose down`, image rebuilds, and
container recreation.

### The one command that destroys everything

```
docker compose down       ← safe, keeps volumes
docker compose down -v    ← DELETES postgres_data, unrecoverable
```

**Never run `-v` on this project.** If something is broken the fix is a forward migration
or `docker compose build --no-cache` — never a volume wipe. "Delete the volume and start
over" loses your data and teaches you nothing, simultaneously.

### Why a named volume and not a bind mount

| | Named volume | Bind mount (`./data:/var/lib/...`) |
|---|---|---|
| Permissions | Docker-managed, correct | host UID/GID clashes → `permission denied` |
| macOS/Windows speed | fast | slow (filesystem translation layer) |
| Accidental `git add` | impossible | database files land in your repo |

Bind mounts are right for **source code** (`./backend:/usr/app`, which is what gives you
live reload) and wrong for **database internals**.

### Back up before every migration

```bash
./scripts/backup.sh
```

Writes `./backups/<db>-YYYYMMDD-HHMMSS.sql`. Not because migrations usually fail — because
the one time it does fail, it fails against data you cared about.

Details that matter, both already implemented:

- **`pg_dump`, not "copy the volume".** Postgres writes lazily through a write-ahead log;
  copying the data directory out from under a running server gives you a torn, possibly
  unrestorable snapshot. `pg_dump` asks the server for a transactionally consistent view.
- The dump is written to a `.partial` file and renamed **only on success**, so a dump that
  dies halfway cannot leave a truncated file that looks valid until the day you need it.
- **`restore.sh` runs psql with `ON_ERROR_STOP=1`.** Without it psql shrugs off failing
  statements and still exits 0, leaving a half-restored database that looks fine.
- Restore makes you type the database name, not `y`. Hard to do by accident at 2am.

Both scripts drive `docker compose exec postgres`, so they need a Compose service named
`postgres`. Until you write it they exit with a clear error rather than doing something
surprising.

### Migrations are forward-only

Schema changes ship as SQL under `backend/prisma/migrations/`, committed to git, applied
with `prisma migrate deploy`.

- **Never `prisma db push`** against a database with data. It reconciles the schema by
  whatever means necessary, including dropping columns, and leaves no artifact — nothing
  to review, replay, or roll forward from.
- Made a mistake? Write the **next** migration that fixes it. Never edit a migration that
  has already run.
- `migrate deploy` never resets and never prompts, which is exactly why it is the
  container-start command. `migrate dev` may offer to reset — never accept that on a
  database whose data you want.

> If `migrate deploy` ever reports **P3005 "database schema is not empty"**, that is the
> guard working: Prisma refuses to apply migrations to a database it did not create. The
> fix is to baseline — apply the SQL by hand inside a transaction, then
> `prisma migrate resolve --applied <migration_name>` to record it. That is how the
> initial migration here was applied without dropping the pre-existing table. It is *not*
> a reason to wipe the volume.

---

## What you need to write

Your `docker-compose.yaml` must provide, at minimum:

**`postgres` service**
- image `postgres:16-alpine` — pin the major version; Postgres refuses to start on a data
  directory written by a newer major, which locks you out of your own volume
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` from the root `.env`
- volume `postgres_data:/var/lib/postgresql/data`, plus a top-level `volumes:` entry
- healthcheck: `pg_isready -h 127.0.0.1 -U $$POSTGRES_USER -d $$POSTGRES_DB`
  - `CMD-SHELL`, not the `CMD` array form, or the variables never expand
  - `$$` so Compose emits a literal `$` and the *container's* shell resolves it
  - `-h 127.0.0.1` because during `initdb` the image runs a temporary server on the unix
    socket only — a socket check reports ready while the real server is still starting
  - `start_period: 30s`, so failures during first boot do not burn the retry budget

**`backend` service**
- `depends_on: postgres: condition: service_healthy` — plain `depends_on` waits only for
  the container to *start*, so the backend would dial a socket nobody is listening on,
  crash, and restart-loop until it happened to win the race
- healthcheck `["CMD", "node", "healthcheck.js"]` (the rewritten one-shot script)

**`frontend` service** — `INTERNAL_API_URL` and `NEXT_PUBLIC_API_URL` per the table above.

**`adminer`** (optional) — set `ADMINER_DEFAULT_SERVER: postgres`.

`docker compose config` must exit 0 with zero warnings before anything else is worth
trying.

### Known bugs in the existing Dockerfiles

These are in the files you own, so they are listed rather than fixed. All four are real
and will bite.

| File | Problem | Fix |
|---|---|---|
| `backend/Dockerfile.prod` | `CMD ["node", "dist/main.js"]` — there is no `dist/`; this is plain JS with no compile step | `CMD ["node", "src/server.js"]`. `yarn build` now exists and runs `prisma generate`, so the build stage no longer fails. |
| `backend/Dockerfile.prod` | `FROM node:${NODE_VERSION}-alpine` where `NODE_VERSION=22-alpine` resolves to `node:22-alpine-alpine`, which does not exist | `FROM node:${NODE_VERSION}` |
| both Dockerfiles | `HEALTHCHECK CMD curl -f .../health` — `curl` is not in `node:alpine`, and `/health` is not a route | backend: `CMD ["node", "healthcheck.js"]`. frontend: `wget --spider -q http://localhost:3000` |
| `frontend/Dockerfile.prod` | `CMD ["yarn", "start"]` — unsupported with `output: "standalone"` | see below |

**Standalone output** is enabled in [next.config.ts](frontend/next.config.ts). It shrinks
what the runtime image needs from **601 MB of `node_modules` to a 68 MB** self-contained
bundle. The runtime stage becomes:

```dockerfile
COPY --from=builder /usr/app/.next/standalone ./
COPY --from=builder /usr/app/.next/static ./.next/static
COPY --from=builder /usr/app/public ./public
CMD ["node", "server.js"]
```

Both extra `COPY` lines are required: static assets and `public/` are deliberately not
traced into standalone, because they are files to be *served*, not *imported*. Miss them
and the app boots fine but every page renders unstyled with no JavaScript — a failure that
looks like a CSS bug rather than a missing `COPY`.

### One security item worth fixing early

`backend/.dockerignore` excludes `.env` and `.env*.local` but **not `.env.dev` or
`.env.prod`**. With `COPY . .` in the Dockerfile, your Postgres password is baked into an
image layer — where it survives `docker history`, and follows the image to any registry
you push it to. Add:

```
.env.dev
.env.prod
```

`frontend/.dockerignore` is completely empty, so `node_modules/` and `.next/` are being
sent to the daemon as build context and can shadow what the build produces. At minimum it
wants `node_modules`, `.next`, `.env.local`.

---

## Production vs this local setup

Worth staying conscious of which one you are writing.

| | Local (here) | Production |
|---|---|---|
| Secrets | plaintext `.env` next to the code | secret manager or Docker secrets, generated not typed, rotated |
| Postgres port | published to the host for psql/Adminer | not published at all; reachable only on the app network |
| Adminer | convenient | not deployed |
| CORS | `http://localhost:3000` | a real domain |
| Backups | manual `backup.sh` | scheduled, off-host, and **restore-tested** — an untested backup is a hope |
| Migrations | `migrate deploy` on container start | a separate job that runs *before* the new version rolls out |
| Unhealthy container | Compose only reports it | Kubernetes readinessProbe pulls the pod from the load balancer; livenessProbe restarts it |
| Rate limiting / auth | none — users are records, not accounts | required before anything is publicly reachable |
