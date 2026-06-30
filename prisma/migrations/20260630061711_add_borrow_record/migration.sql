-- CreateEnum
CREATE TYPE "BorrowStatus" AS ENUM ('BORROWED', 'RETURNED', 'OVERDUE', 'DAMAGED', 'LOST');

-- CreateEnum
CREATE TYPE "ReturnCondition" AS ENUM ('SAME_AS_BORROWED', 'GOOD', 'DAMAGED', 'MISSING', 'NEEDS_REPAIR');

-- CreateTable
CREATE TABLE "borrow_records" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT,
    "borrowerName" TEXT NOT NULL,
    "borrowerContact" TEXT,
    "itemId" TEXT NOT NULL,
    "itemUnitId" TEXT,
    "quantity" INTEGER,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "returnCondition" "ReturnCondition",
    "approvedById" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "status" "BorrowStatus" NOT NULL DEFAULT 'BORROWED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrow_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "borrow_records_status_idx" ON "borrow_records"("status");

-- CreateIndex
CREATE INDEX "borrow_records_borrowerId_idx" ON "borrow_records"("borrowerId");

-- CreateIndex
CREATE INDEX "borrow_records_itemId_idx" ON "borrow_records"("itemId");

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_itemUnitId_fkey" FOREIGN KEY ("itemUnitId") REFERENCES "item_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
