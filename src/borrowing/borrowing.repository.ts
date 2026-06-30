import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AvailabilityStatus,
  BorrowStatus,
  ItemCondition,
  Prisma,
  ReturnCondition,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BorrowQuantityInput,
  BorrowUnitInput,
  BorrowWithRelations,
  borrowInclude,
} from './borrowing.types';

type Tx = Prisma.TransactionClient;

@Injectable()
export class BorrowingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Queries -------------------------------------------------------------

  listActiveByBorrower(borrowerId: string): Promise<BorrowWithRelations[]> {
    return this.prisma.borrowRecord.findMany({
      where: { borrowerId, returnedAt: null },
      include: borrowInclude,
      orderBy: { borrowedAt: 'desc' },
    });
  }

  listActiveByItemId(itemId: string): Promise<BorrowWithRelations[]> {
    return this.prisma.borrowRecord.findMany({
      where: { itemId, returnedAt: null },
      include: borrowInclude,
      orderBy: { borrowedAt: 'desc' },
    });
  }

  findById(id: string): Promise<BorrowWithRelations | null> {
    return this.prisma.borrowRecord.findUnique({ where: { id }, include: borrowInclude });
  }

  // ---- Transactional mutations --------------------------------------------

  /** Recompute an item's unit counts from its active units (within a tx). */
  private async recompute(tx: Tx, itemId: string): Promise<void> {
    const [total, available] = await Promise.all([
      tx.itemUnit.count({ where: { itemId, isArchived: false } }),
      tx.itemUnit.count({
        where: { itemId, isArchived: false, availabilityStatus: AvailabilityStatus.AVAILABLE },
      }),
    ]);
    await tx.item.update({ where: { id: itemId }, data: { quantity: total, quantityAvailable: available } });
  }

  async borrowQuantity(input: BorrowQuantityInput): Promise<BorrowWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: input.itemId } });
      if (!item) throw new NotFoundException('Item not found.');
      const available = item.quantityAvailable ?? 0;
      if (input.quantity > available) {
        throw new BadRequestException(`Only ${available} available right now.`);
      }
      await tx.item.update({
        where: { id: item.id },
        data: { quantityAvailable: available - input.quantity },
      });
      return tx.borrowRecord.create({
        data: {
          item: { connect: { id: input.itemId } },
          borrower: { connect: { id: input.borrowerId } },
          borrowerName: input.borrowerName,
          quantity: input.quantity,
          purpose: input.purpose ?? null,
          dueDate: input.dueDate ?? null,
          status: BorrowStatus.BORROWED,
        },
        include: borrowInclude,
      });
    });
  }

  async borrowUnit(input: BorrowUnitInput): Promise<BorrowWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.itemUnit.findUnique({ where: { id: input.itemUnitId } });
      if (!unit) throw new NotFoundException('Unit not found.');
      if (unit.availabilityStatus !== AvailabilityStatus.AVAILABLE || unit.isArchived) {
        throw new BadRequestException('This unit is not available right now.');
      }
      await tx.itemUnit.update({
        where: { id: unit.id },
        data: { availabilityStatus: AvailabilityStatus.BORROWED },
      });
      const record = await tx.borrowRecord.create({
        data: {
          item: { connect: { id: input.itemId } },
          itemUnit: { connect: { id: input.itemUnitId } },
          borrower: { connect: { id: input.borrowerId } },
          borrowerName: input.borrowerName,
          quantity: 1,
          purpose: input.purpose ?? null,
          dueDate: input.dueDate ?? null,
          status: BorrowStatus.BORROWED,
        },
        include: borrowInclude,
      });
      await this.recompute(tx, input.itemId);
      return record;
    });
  }

  async returnRecord(
    recordId: string,
    returnCondition: ReturnCondition | null,
  ): Promise<BorrowWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.borrowRecord.findUnique({ where: { id: recordId } });
      if (!record) throw new NotFoundException('Borrow record not found.');
      if (record.returnedAt) throw new BadRequestException('This item was already returned.');

      const missing = returnCondition === ReturnCondition.MISSING;
      const damaged = returnCondition === ReturnCondition.DAMAGED;
      const needsRepair = returnCondition === ReturnCondition.NEEDS_REPAIR;
      const status = missing
        ? BorrowStatus.LOST
        : damaged || needsRepair
          ? BorrowStatus.DAMAGED
          : BorrowStatus.RETURNED;

      await tx.borrowRecord.update({
        where: { id: record.id },
        data: { returnedAt: new Date(), returnCondition, status },
      });

      if (record.itemUnitId) {
        if (missing) {
          await tx.itemUnit.update({
            where: { id: record.itemUnitId },
            data: { availabilityStatus: AvailabilityStatus.MISSING, condition: ItemCondition.LOST },
          });
        } else if (damaged || needsRepair) {
          await tx.itemUnit.update({
            where: { id: record.itemUnitId },
            data: {
              availabilityStatus: AvailabilityStatus.MAINTENANCE,
              condition: damaged ? ItemCondition.BROKEN : ItemCondition.NEEDS_REPAIR,
            },
          });
        } else {
          await tx.itemUnit.update({
            where: { id: record.itemUnitId },
            data: { availabilityStatus: AvailabilityStatus.AVAILABLE },
          });
        }
        await this.recompute(tx, record.itemId);
      } else if (record.quantity) {
        // Returned quantity comes back to stock (unless reported missing).
        if (!missing) {
          await tx.item.update({
            where: { id: record.itemId },
            data: { quantityAvailable: { increment: record.quantity } },
          });
        }
      }

      return tx.borrowRecord.findUnique({
        where: { id: record.id },
        include: borrowInclude,
      }) as Promise<BorrowWithRelations>;
    });
  }
}
