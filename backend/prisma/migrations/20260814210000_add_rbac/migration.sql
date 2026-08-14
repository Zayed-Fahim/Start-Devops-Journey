-- AlterTable
ALTER TABLE "users" ADD COLUMN     "roleId" UUID;

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "group" VARCHAR(32) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" VARCHAR(255),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_group_idx" ON "permissions"("group");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Data migration: seed permissions and the three system roles, then backfill
-- every existing user from the legacy Role enum.
--
-- The permission sets below reproduce today's behaviour EXACTLY, so this
-- migration changes how authorisation is expressed without changing who can
-- do what:
--   ADMIN      - everything
--   DEVELOPER  - read users only
--   USER       - read users only
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("id", "key", "label", "description", "group", "sortOrder") VALUES
  (gen_random_uuid(), 'users.read',   'View users',      'See the user list and individual user records', 'Users', 1),
  (gen_random_uuid(), 'users.create', 'Create users',    'Add new user records',                          'Users', 2),
  (gen_random_uuid(), 'users.update', 'Edit users',      'Change name, email, role or status',            'Users', 3),
  (gen_random_uuid(), 'users.delete', 'Delete users',    'Permanently remove user records',               'Users', 4),
  (gen_random_uuid(), 'audit.read',   'View audit logs', 'Read the full history of user and system actions', 'Audit', 5),
  (gen_random_uuid(), 'roles.read',   'View roles',      'See roles and their permissions',               'Roles', 6),
  (gen_random_uuid(), 'roles.manage', 'Manage roles',    'Create, edit and delete custom roles',          'Roles', 7);

INSERT INTO "roles" ("id", "name", "description", "isSystem", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'ADMIN',     'Full access to users, roles and audit logs', true, NOW(), NOW()),
  (gen_random_uuid(), 'DEVELOPER', 'Read-only access to the user directory',      true, NOW(), NOW()),
  (gen_random_uuid(), 'USER',      'Read-only access to the user directory',      true, NOW(), NOW());

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'ADMIN';

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" IN ('DEVELOPER', 'USER') AND p."key" = 'users.read';

UPDATE "users" u
SET "roleId" = r."id"
FROM "roles" r
WHERE r."name" = u."role"::text AND u."roleId" IS NULL;

ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
