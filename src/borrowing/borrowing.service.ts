import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReturnCondition, TrackingType } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { ItemWithRelations } from '../inventory/inventory.types';
import { BorrowingRepository } from './borrowing.repository';
import { BorrowWithRelations } from './borrowing.types';

export interface Borrower {
  id: string;
  fullName: string;
}

@Injectable()
export class BorrowingService {
  constructor(
    private readonly repository: BorrowingRepository,
    private readonly inventory: InventoryService,
  ) {}

  listActiveByUser(borrowerId: string): Promise<BorrowWithRelations[]> {
    return this.repository.listActiveByBorrower(borrowerId);
  }

  getActiveById(id: string): Promise<BorrowWithRelations | null> {
    return this.repository.findById(id);
  }

  async listActiveByItemCode(
    code: string,
  ): Promise<{ item: ItemWithRelations; records: BorrowWithRelations[] } | null> {
    const item = await this.inventory.getByCode(code);
    if (!item) return null;
    const records = await this.repository.listActiveByItemId(item.id);
    return { item, records };
  }

  /** Borrow a quantity from a bulk/consumable item. */
  async borrowQuantity(
    itemCode: string,
    borrower: Borrower,
    quantity: number,
    purpose?: string | null,
    dueDate?: Date | null,
  ): Promise<BorrowWithRelations> {
    const item = await this.inventory.getByCode(itemCode);
    if (!item) {
      throw new NotFoundException(`Item ${itemCode} was not found.`);
    }
    if (item.trackingType === TrackingType.INDIVIDUAL_ASSET) {
      throw new BadRequestException('This is an individual-asset item — borrow a specific unit instead.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity to borrow must be a whole number of 1 or more.');
    }
    return this.repository.borrowQuantity({
      itemId: item.id,
      borrowerId: borrower.id,
      borrowerName: borrower.fullName,
      quantity,
      purpose: purpose ?? null,
      dueDate: dueDate ?? null,
    });
  }

  /** Borrow a specific physical unit of an individual-asset item. */
  async borrowUnit(
    unitCode: string,
    borrower: Borrower,
    purpose?: string | null,
    dueDate?: Date | null,
  ): Promise<BorrowWithRelations> {
    const unit = await this.inventory.getUnitByCode(unitCode);
    if (!unit) {
      throw new NotFoundException(`Unit ${unitCode} was not found.`);
    }
    return this.repository.borrowUnit({
      itemId: unit.itemId,
      itemUnitId: unit.id,
      borrowerId: borrower.id,
      borrowerName: borrower.fullName,
      purpose: purpose ?? null,
      dueDate: dueDate ?? null,
    });
  }

  returnRecord(recordId: string, returnCondition?: ReturnCondition | null): Promise<BorrowWithRelations> {
    return this.repository.returnRecord(recordId, returnCondition ?? null);
  }
}
