-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('INDIVIDUAL_ASSET', 'BULK_STOCK', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'NEEDS_REPAIR', 'BROKEN', 'LOST', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'BORROWED', 'MAINTENANCE', 'MISSING', 'RETIRED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "OwnerSource" AS ENUM ('LAB_PURCHASE', 'UNIVERSITY_ASSET', 'DONATION', 'PERSONAL_LOAN', 'UNKNOWN');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategory" TEXT,
    "trackingType" "TrackingType" NOT NULL,
    "brandModel" TEXT,
    "description" TEXT,
    "serialNumber" TEXT,
    "assetTag" TEXT,
    "quantity" INTEGER,
    "quantityAvailable" INTEGER,
    "unit" TEXT,
    "minimumStock" INTEGER,
    "condition" "ItemCondition" NOT NULL DEFAULT 'UNKNOWN',
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "locationId" TEXT,
    "storageDetail" TEXT,
    "responsiblePic" TEXT,
    "ownerSource" "OwnerSource" NOT NULL DEFAULT 'UNKNOWN',
    "ownerName" TEXT,
    "acquiredAt" TIMESTAMP(3),
    "purchasePrice" DECIMAL(65,30),
    "warrantyExpiry" TIMESTAMP(3),
    "lastCheckedDate" TIMESTAMP(3),
    "checkFrequencyDays" INTEGER,
    "nextCheckDue" TIMESTAMP(3),
    "photoLink" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");

-- CreateIndex
CREATE INDEX "items_name_idx" ON "items"("name");

-- CreateIndex
CREATE INDEX "items_categoryId_idx" ON "items"("categoryId");

-- CreateIndex
CREATE INDEX "items_locationId_idx" ON "items"("locationId");

-- CreateIndex
CREATE INDEX "items_availabilityStatus_idx" ON "items"("availabilityStatus");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
