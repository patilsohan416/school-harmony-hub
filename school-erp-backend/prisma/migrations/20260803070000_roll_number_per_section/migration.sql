-- DropIndex
DROP INDEX IF EXISTS "Student_classId_rollNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Student_sectionId_rollNumber_key" ON "Student"("sectionId", "rollNumber");