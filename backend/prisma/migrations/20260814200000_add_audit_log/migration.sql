-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SECURITY');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "actorLabel" VARCHAR(160) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "targetType" VARCHAR(32),
    "targetId" VARCHAR(64),
    "targetLabel" VARCHAR(255),
    "ip" VARCHAR(64),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Every new table gets RLS immediately, for the same reason as
-- 20260814190000_enable_row_level_security: Supabase serves PostgREST over this
-- database with the anon key, and audit logs are exactly the kind of data that
-- must not be readable that way.
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
