-- CreateTable
CREATE TABLE "item_units" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "serialNumber" TEXT,
    "brandModel" TEXT,
    "specs" TEXT,
    "condition" "ItemCondition" NOT NULL DEFAULT 'UNKNOWN',
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "locationId" TEXT,
    "storageDetail" TEXT,
    "warrantyExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_units_unitCode_key" ON "item_units"("unitCode");

-- CreateIndex
CREATE INDEX "item_units_itemId_idx" ON "item_units"("itemId");

-- CreateIndex
CREATE INDEX "item_units_availabilityStatus_idx" ON "item_units"("availabilityStatus");

-- AddForeignKey
ALTER TABLE "item_units" ADD CONSTRAINT "item_units_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_units" ADD CONSTRAINT "item_units_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
