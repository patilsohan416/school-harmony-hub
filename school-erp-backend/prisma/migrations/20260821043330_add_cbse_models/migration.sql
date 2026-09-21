-- CreateTable
CREATE TABLE "CbseSubject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "theoryMarks" INTEGER DEFAULT 100,
    "passMarks" INTEGER DEFAULT 33,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbseSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbseExam" (
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

    CONSTRAINT "CbseExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbseExamMark" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalMarks" DECIMAL(5,2),
    "maxMarks" DECIMAL(6,2),
    "percentage" DECIMAL(5,2),
    "marksEnteredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbseExamMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CbseSubject_tenantId_code_key" ON "CbseSubject"("tenantId", "code");

-- CreateIndex
CREATE INDEX "CbseExam_classId_academicYear_idx" ON "CbseExam"("classId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "CbseExamMark_studentId_examId_subjectId_key" ON "CbseExamMark"("studentId", "examId", "subjectId");

-- AddForeignKey
ALTER TABLE "CbseSubject" ADD CONSTRAINT "CbseSubject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbseExam" ADD CONSTRAINT "CbseExam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbseExam" ADD CONSTRAINT "CbseExam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbseExam" ADD CONSTRAINT "CbseExam_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbseExamMark" ADD CONSTRAINT "CbseExamMark_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbseExamMark" ADD CONSTRAINT "CbseExamMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbseExamMark" ADD CONSTRAINT "CbseExamMark_examId_fkey" FOREIGN KEY ("examId") REFERENCES "CbseExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbseExamMark" ADD CONSTRAINT "CbseExamMark_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CbseSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
