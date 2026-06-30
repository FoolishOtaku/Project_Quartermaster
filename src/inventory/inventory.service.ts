import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TrackingType } from '@prisma/client';
import { InventoryRepository } from './inventory.repository';
import { codePrefix, nextItemCode } from './item-code.util';
import {
  CreateItemInput,
  ItemWithRelations,
  UpdateItemInput,
} from './inventory.types';

/** Tracking types that v0.2.0 supports (quantity-based only). */
export const SUPPORTED_TRACKING_TYPES: TrackingType[] = [
  TrackingType.BULK_STOCK,
  TrackingType.CONSUMABLE,
];

@Injectable()
export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  /** Generate the next free code for a category, checking the database. */
  async generateCode(categoryName: string): Promise<string> {
    const existing = await this.repository.codesWithPrefix(
      codePrefix(categoryName),
    );
    return nextItemCode(categoryName, existing);
  }

  async createItem(input: CreateItemInput): Promise<ItemWithRelations> {
    if (!input.name?.trim()) {
      throw new BadRequestException('Item name is required.');
    }
    if (!SUPPORTED_TRACKING_TYPES.includes(input.trackingType)) {
      throw new BadRequestException(
        'Tracking type must be Bulk Stock or Consumable in this version.',
      );
    }
    if (!Number.isInteger(input.quantity) || input.quantity < 0) {
      throw new BadRequestException('Quantity must be an integer of 0 or more.');
    }
    if (
      input.minimumStock != null &&
      (!Number.isInteger(input.minimumStock) || input.minimumStock < 0)
    ) {
      throw new BadRequestException(
        'Minimum stock must be an integer of 0 or more.',
      );
    }

    const code = await this.generateCode(input.categoryName);

    const data: Prisma.ItemCreateInput = {
      code,
      name: input.name.trim(),
      trackingType: input.trackingType,
      quantity: input.quantity,
      quantityAvailable: input.quantity,
      unit: input.unit ?? null,
      minimumStock: input.minimumStock ?? null,
      storageDetail: input.storageDetail ?? null,
      responsiblePic: input.responsiblePic ?? null,
      ownerName: input.ownerName ?? null,
      notes: input.notes ?? null,
      category: { connect: { id: input.categoryId } },
      ...(input.locationId
        ? { location: { connect: { id: input.locationId } } }
        : {}),
      ...(input.condition ? { condition: input.condition } : {}),
      ...(input.availabilityStatus
        ? { availabilityStatus: input.availabilityStatus }
        : {}),
      ...(input.ownerSource ? { ownerSource: input.ownerSource } : {}),
    };

    return this.repository.create(data);
  }

  getByCode(code: string): Promise<ItemWithRelations | null> {
    return this.repository.findByCode(code.trim());
  }

  search(query: string): Promise<ItemWithRelations[]> {
    return this.repository.search(query.trim());
  }

  async updateItem(
    code: string,
    changes: UpdateItemInput,
  ): Promise<ItemWithRelations> {
    const item = await this.repository.findByCode(code.trim());
    if (!item) {
      throw new NotFoundException(`Item ${code} was not found.`);
    }

    if (
      changes.quantity != null &&
      (!Number.isInteger(changes.quantity) || changes.quantity < 0)
    ) {
      throw new BadRequestException('Quantity must be an integer of 0 or more.');
    }

    const data: Prisma.ItemUpdateInput = {};

    if (changes.name != null) data.name = changes.name.trim();
    if (changes.unit !== undefined) data.unit = changes.unit;
    if (changes.minimumStock !== undefined) data.minimumStock = changes.minimumStock;
    if (changes.storageDetail !== undefined) data.storageDetail = changes.storageDetail;
    if (changes.condition != null) data.condition = changes.condition;
    if (changes.availabilityStatus != null)
      data.availabilityStatus = changes.availabilityStatus;
    if (changes.ownerSource != null) data.ownerSource = changes.ownerSource;
    if (changes.notes !== undefined) data.notes = changes.notes;
    if (changes.locationId !== undefined) {
      data.location = changes.locationId
        ? { connect: { id: changes.locationId } }
        : { disconnect: true };
    }

    if (changes.quantity != null) {
      // Keep availability in step with total until borrowing exists (v0.4.0).
      const borrowed = (item.quantity ?? 0) - (item.quantityAvailable ?? 0);
      data.quantity = changes.quantity;
      data.quantityAvailable = Math.max(0, changes.quantity - Math.max(0, borrowed));
    }

    return this.repository.update(item.id, data);
  }

  async archiveItem(code: string): Promise<ItemWithRelations> {
    const item = await this.repository.findByCode(code.trim());
    if (!item) {
      throw new NotFoundException(`Item ${code} was not found.`);
    }
    return this.repository.update(item.id, { isArchived: true });
  }
}
