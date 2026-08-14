-- Notifications, documents and support requests, plus the per-user display
-- preferences that decide how every timestamp in the app is rendered.
--
-- Notifications are addressed to a recipient rather than derived from the
-- audit log. The audit log answers "what happened to the system"; a
-- notification answers "what should this person be told", and only the second
-- can carry a per-user read state without inventing a join table over every
-- historical event.
--
-- Documents cover both the docs and the support page. They share a shape —
-- an admin-edited title and body addressed by slug — so one table with a kind
-- discriminator avoids two identical ones. The unique key is (kind, slug), so
-- docs and support can each have their own "index" page.

-- CreateEnum
CREATE TYPE "TimeFormat" AS ENUM ('H12', 'H24');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('DOCS', 'SUPPORT');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country" VARCHAR(2),
ADD COLUMN     "timezone" VARCHAR(64),
ADD COLUMN     "timeFormat" "TimeFormat" NOT NULL DEFAULT 'H24';

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(500),
    "href" VARCHAR(255),
    "category" "AuditCategory" NOT NULL DEFAULT 'UPDATE',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subject" VARCHAR(160) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "documents_kind_idx" ON "documents"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "documents_kind_slug_key" ON "documents"("kind", "slug");

-- CreateIndex
CREATE INDEX "support_requests_status_createdAt_idx" ON "support_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "support_requests_userId_createdAt_idx" ON "support_requests"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Two more permissions, granted to ADMIN only. Reading the docs and support
-- pages needs no permission: every signed-in user can read them, and any user
-- can raise a support request. Only editing the pages and working through the
-- request queue is gated.
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("id", "key", "label", "description", "group", "sortOrder") VALUES
  (gen_random_uuid(), 'docs.manage',    'Manage docs',    'Create and edit documentation pages',        'Content', 10),
  (gen_random_uuid(), 'support.manage', 'Manage support', 'Edit the support page and resolve requests', 'Content', 11);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'ADMIN'
  AND p."key" IN ('docs.manage', 'support.manage')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;


-- ---------------------------------------------------------------------------
-- Seed the two pages so the routes have something to render before an admin
-- has written anything.
-- ---------------------------------------------------------------------------

INSERT INTO "documents" ("id", "kind", "slug", "title", "body", "createdAt", "updatedAt") VALUES
  (
    gen_random_uuid(),
    'DOCS',
    'index',
    'Documentation',
    E'## Getting started\n\nThis dashboard manages users, teams and the roles that decide who can do what.\n\n- **Users** is the directory. Create people, change their role or status, and remove them.\n- **Teams** groups people and names a lead.\n- **Permissions** shows exactly what each role can do, and lets you define new roles.\n- **Audit Logs** records every change, who made it and from where.\n\nAn administrator can edit this page.',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'SUPPORT',
    'index',
    'Support',
    E'## Before you raise a request\n\nCheck the documentation first — most questions about roles and permissions are answered there.\n\nIf you still need help, use the form below. Include what you were doing and what you expected to happen.\n\nAn administrator can edit this page.',
    NOW(),
    NOW()
  );


-- ---------------------------------------------------------------------------
-- Same posture as every other table: RLS on, no policies, so only the backend
-- reaches these rows.
-- ---------------------------------------------------------------------------

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_requests" ENABLE ROW LEVEL SECURITY;
