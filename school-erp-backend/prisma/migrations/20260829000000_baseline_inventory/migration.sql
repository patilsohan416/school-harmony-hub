-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "requiredQuantity" INTEGER NOT NULL DEFAULT 0,
    "purchasePrice" DECIMAL(10,2),
    "sellingPrice" DECIMAL(10,2),
    "supplier" TEXT,
    "location" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockInEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "brandName" TEXT,
    "receiptNumber" TEXT,
    "quantity" INTEGER NOT NULL,
    "requiredQuantity" INTEGER NOT NULL,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StockInEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "monthLabel" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "totalValue" DECIMAL(12,2) NOT NULL,
    "lowStockItems" INTEGER NOT NULL,
    "categories" JSONB NOT NULL,
    "generatedOn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_category_idx" ON "InventoryItem"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_tenantId_itemCode_key" ON "InventoryItem"("tenantId", "itemCode");

-- CreateIndex
CREATE INDEX "StockInEntry_tenantId_category_idx" ON "StockInEntry"("tenantId", "category");

-- CreateIndex
CREATE INDEX "StockInEntry_tenantId_material_idx" ON "StockInEntry"("tenantId", "material");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_supplierName_idx" ON "Supplier"("tenantId", "supplierName");

-- CreateIndex
CREATE INDEX "InventoryReport_tenantId_month_idx" ON "InventoryReport"("tenantId", "month");