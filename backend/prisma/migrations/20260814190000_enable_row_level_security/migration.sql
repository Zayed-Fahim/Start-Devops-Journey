-- Enable Row Level Security on every application table.
--
-- Supabase exposes the database through PostgREST using the anon and
-- authenticated roles. With RLS disabled, anyone holding the publishable
-- (anon) key can read and modify these tables directly, bypassing the API,
-- its CSRF check and its role gate. That includes bcrypt password hashes and
-- refresh token digests.
--
-- No policies are added on purpose. RLS with zero policies denies all access
-- to the anon and authenticated roles, which is exactly what this project
-- wants: the database is reached only by the backend.
--
-- The backend is unaffected. It connects as the table owner, and Postgres
-- exempts table owners from RLS unless FORCE ROW LEVEL SECURITY is set.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
