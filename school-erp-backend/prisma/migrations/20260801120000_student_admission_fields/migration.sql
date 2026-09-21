-- CreateEnum
CREATE TYPE "Category" AS ENUM ('GENERAL', 'OBC', 'SC', 'ST', 'EWS');

-- Backfill nullable values that are about to become required / unique,
-- so the migration is safe to run against an existing (already-seeded) database.
UPDATE "Student" SET "lastName" = '' WHERE "lastName" IS NULL;
UPDATE "Student" SET "email" = "admissionNo" || '@placeholder.local' WHERE "email" IS NULL;
UPDATE "Student" SET "grNo" = "admissionNo" WHERE "grNo" IS NULL;

-- AlterTable: add new columns
ALTER TABLE "Student"
  ADD COLUMN "middleName" TEXT,
  ADD COLUMN "category" "Category",
  ADD COLUMN "passportNumber" TEXT;

-- AlterTable: relax constraints that are no longer required
ALTER TABLE "Student" ALTER COLUMN "grNo" DROP NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "mobile" DROP NOT NULL;

-- AlterTable: tighten constraints per the new admission form
ALTER TABLE "Student" ALTER COLUMN "lastName" SET NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Student_passportNumber_key" ON "Student"("passportNumber");
CREATE UNIQUE INDEX "Student_classId_rollNumber_key" ON "Student"("classId", "rollNumber");
