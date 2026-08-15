import { defineConfig, env } from 'prisma/config';

/**
 * CLI-only configuration. Prisma 7 dropped the Rust query engine, so the
 * *runtime* connection is owned by the driver adapter in src/lib/prisma.js —
 * nothing here affects a running server.
 *
 * That split is why `url` points at DIRECT_URL (the session pooler on 5432)
 * rather than DATABASE_URL:
 *
 *   migrations   -> session pooler. The schema engine takes a session-scoped
 *                   advisory lock and runs DDL in a transaction. The
 *                   transaction pooler on 6543 cannot hold either, so pointing
 *                   the engine there makes `migrate status`/`deploy` hang
 *                   forever rather than fail.
 *   app queries  -> transaction pooler, via the adapter. Short-lived, pooled,
 *                   and now safe without the pgbouncer flag because the adapter
 *                   sends unnamed prepared statements by default.
 *
 * v6 expressed this with `directUrl` in the datasource block. In v7 the schema
 * engine reads `url` and ignores `directUrl`, so the direct URL has to be `url`.
 *
 * Both values are assembled from the DB_* parts by src/lib/env.js and injected
 * by scripts/with-db-url.js, so every `pnpm run db:*` script is unchanged.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
