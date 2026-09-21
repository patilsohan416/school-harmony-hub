-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "heightCm" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "weightKg" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "IcseSubject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "theoryMarks" INTEGER DEFAULT 100,
    "passMarks" INTEGER DEFAULT 35,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IcseSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IcseExam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IcseExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IcseExamMark" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalMarks" DECIMAL(5,2),
    "percentage" DECIMAL(5,2),
    "marksEnteredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IcseExamMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IcseSubject_tenantId_code_key" ON "IcseSubject"("tenantId", "code");

-- CreateIndex
CREATE INDEX "IcseExam_classId_academicYear_idx" ON "IcseExam"("classId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "IcseExamMark_studentId_examId_subjectId_key" ON "IcseExamMark"("studentId", "examId", "subjectId");

-- AddForeignKey
ALTER TABLE "IcseSubject" ADD CONSTRAINT "IcseSubject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcseExam" ADD CONSTRAINT "IcseExam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcseExam" ADD CONSTRAINT "IcseExam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcseExam" ADD CONSTRAINT "IcseExam_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcseExamMark" ADD CONSTRAINT "IcseExamMark_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcseExamMark" ADD CONSTRAINT "IcseExamMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcseExamMark" ADD CONSTRAINT "IcseExamMark_examId_fkey" FOREIGN KEY ("examId") REFERENCES "IcseExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcseExamMark" ADD CONSTRAINT "IcseExamMark_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "IcseSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
