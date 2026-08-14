-- Teams: a grouping of users, with an optional lead.
--
-- The lead is a nullable column on "teams" rather than a flag on the
-- membership rows. One lead per team is then true by construction — there is
-- only one column to hold it — instead of being an invariant defended by a
-- partial unique index. That matters here for two reasons. Prisma cannot
-- express a partial index, so the index would exist in the database but not in
-- schema.prisma, and the next `prisma migrate dev` would generate a DROP for
-- it; under this project's forward-only rule that silently removes the
-- guarantee. And a partial index is checked per statement, so promoting a new
-- lead before demoting the old one raises 23505 and the whole write fails.
--
-- The lead is not required to be a member at the database level. The service
-- enforces that, and clears the column when that member is removed.

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" VARCHAR(255),
    "leadUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE INDEX "teams_leadUserId_idx" ON "teams"("leadUserId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leadUserId_fkey" FOREIGN KEY ("leadUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Two new permissions, granted to ADMIN only, which is how the audit and roles
-- permissions were introduced. DEVELOPER and USER gain nothing, so this
-- migration adds a capability without changing who can do what today.
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("id", "key", "label", "description", "group", "sortOrder") VALUES
  (gen_random_uuid(), 'teams.read',   'View teams',   'See teams and their members',                          'Teams', 8),
  (gen_random_uuid(), 'teams.manage', 'Manage teams', 'Create, edit and delete teams, and change membership', 'Teams', 9);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'ADMIN'
  AND p."key" IN ('teams.read', 'teams.manage')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;


-- ---------------------------------------------------------------------------
-- Same posture as every other table: RLS on, no policies, so the anon and
-- authenticated Supabase roles are denied and only the backend, which connects
-- as the table owner, can reach these rows.
-- ---------------------------------------------------------------------------

ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
