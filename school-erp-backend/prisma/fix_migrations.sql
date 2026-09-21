-- Remove tracking rows for migrations that were applied to the DB
-- but whose local migration folders no longer exist.
-- This does NOT touch your actual tables, columns, or data —
-- it only edits Prisma's internal bookkeeping table.
DELETE FROM "_prisma_migrations"
WHERE migration_name IN (
  '20260829071027_add_middle_name_to_teacher',
  '20260829071743_add_middle_name_to_teacher'
);