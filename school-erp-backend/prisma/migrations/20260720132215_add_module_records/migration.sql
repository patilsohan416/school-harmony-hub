-- CreateTable
CREATE TABLE "ModuleRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleRecord_tenantId_module_idx" ON "ModuleRecord"("tenantId", "module");

-- CreateIndex
CREATE INDEX "ModuleRecord_tenantId_module_deletedAt_idx" ON "ModuleRecord"("tenantId", "module", "deletedAt");
