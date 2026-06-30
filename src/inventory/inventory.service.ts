import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TrackingType } from '@prisma/client';
import { InventoryRepository } from './inventory.repository';
import { ItemUnitRepository } from './item-unit.repository';
import { codePrefix, nextItemCode, nextUnitCode } from './item-code.util';
import {
  CreateItemInput,
  CreateUnitInput,
  ItemUnitWithRelations,
  ItemWithRelations,
  UpdateItemInput,
  UpdateUnitInput,
} from './inventory.types';

/** Quantity-based tracking types (use Item.quantity directly). */
export const QUANTITY_TRACKING_TYPES: TrackingType[] = [
  TrackingType.BULK_STOCK,
  TrackingType.CONSUMABLE,
];

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly units: ItemUnitRepository,
  ) {}

  // ---- Items ---------------------------------------------------------------

  /** Generate the next free item code for a category. */
  async generateCode(categoryName: string): Promise<string> {
    const existing = await this.repository.codesWithPrefix(codePrefix(categoryName));
    return nextItemCode(categoryName, existing);
  }

  async createItem(input: CreateItemInput): Promise<ItemWithRelations> {
    if (!input.name?.trim()) {
      throw new BadRequestException('Item name is required.');
    }

    const isIndividual = input.trackingType === TrackingType.INDIVIDUAL_ASSET;

    if (!isIndividual) {
      if (!QUANTITY_TRACKING_TYPES.includes(input.trackingType)) {
        throw new BadRequestException('Unsupported tracking type.');
      }
      if (!Number.isInteger(input.quantity) || (input.quantity ?? -1) < 0) {
        throw new BadRequestException('Quantity must be an integer of 0 or more.');
      }
      if (
        input.minimumStock != null &&
        (!Number.isInteger(input.minimumStock) || input.minimumStock < 0)
      ) {
        throw new BadRequestException('Minimum stock must be an integer of 0 or more.');
      }
    }

    const code = await this.generateCode(input.categoryName);

    // Individual-asset items start with 0 units; counts grow as units are added.
    const quantity = isIndividual ? 0 : (input.quantity as number);

    const data: Prisma.ItemCreateInput = {
      code,
      name: input.name.trim(),
      trackingType: input.trackingType,
      brandModel: input.brandModel ?? null,
      quantity,
      quantityAvailable: quantity,
      unit: isIndividual ? null : input.unit ?? null,
      minimumStock: isIndividual ? null : input.minimumStock ?? null,
      storageDetail: input.storageDetail ?? null,
      responsiblePic: input.responsiblePic ?? null,
      ownerName: input.ownerName ?? null,
      notes: input.notes ?? null,
      category: { connect: { id: input.categoryId } },
      ...(input.locationId ? { location: { connect: { id: input.locationId } } } : {}),
      ...(input.condition ? { condition: input.condition } : {}),
      ...(input.availabilityStatus ? { availabilityStatus: input.availabilityStatus } : {}),
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

  async updateItem(code: string, changes: UpdateItemInput): Promise<ItemWithRelations> {
    const item = await this.repository.findByCode(code.trim());
    if (!item) {
      throw new NotFoundException(`Item ${code} was not found.`);
    }
    if (item.trackingType === TrackingType.INDIVIDUAL_ASSET && changes.quantity != null) {
      throw new BadRequestException(
        'Quantity of an individual-asset item is managed by its units. Use /add_unit or /archive_unit.',
      );
    }
    if (changes.quantity != null && (!Number.isInteger(changes.quantity) || changes.quantity < 0)) {
      throw new BadRequestException('Quantity must be an integer of 0 or more.');
    }

    const data: Prisma.ItemUpdateInput = {};
    if (changes.name != null) data.name = changes.name.trim();
    if (changes.unit !== undefined) data.unit = changes.unit;
    if (changes.minimumStock !== undefined) data.minimumStock = changes.minimumStock;
    if (changes.storageDetail !== undefined) data.storageDetail = changes.storageDetail;
    if (changes.condition != null) data.condition = changes.condition;
    if (changes.availabilityStatus != null) data.availabilityStatus = changes.availabilityStatus;
    if (changes.ownerSource != null) data.ownerSource = changes.ownerSource;
    if (changes.notes !== undefined) data.notes = changes.notes;
    if (changes.locationId !== undefined) {
      data.location = changes.locationId
        ? { connect: { id: changes.locationId } }
        : { disconnect: true };
    }
    if (changes.quantity != null) {
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

  // ---- Units (individual assets) ------------------------------------------

  listUnits(itemId: string): Promise<ItemUnitWithRelations[]> {
    return this.units.listByItemId(itemId);
  }

  getUnitByCode(unitCode: string): Promise<ItemUnitWithRelations | null> {
    return this.units.findByCode(unitCode.trim());
  }

  /** Recompute the parent item's quantity/available from its active units. */
  async recomputeItemCounts(itemId: string): Promise<void> {
    const { total, available } = await this.units.countsByItemId(itemId);
    await this.repository.update(itemId, {
      quantity: total,
      quantityAvailable: available,
    });
  }

  async addUnit(itemCode: string, input: CreateUnitInput): Promise<ItemUnitWithRelations> {
    const item = await this.repository.findByCode(itemCode.trim());
    if (!item) {
      throw new NotFoundException(`Item ${itemCode} was not found.`);
    }
    if (item.trackingType !== TrackingType.INDIVIDUAL_ASSET) {
      throw new BadRequestException(
        'Units can only be added to individual-asset items. Use /update_item to change a quantity.',
      );
    }

    const existing = await this.units.unitCodesByItemId(item.id);
    const unitCode = nextUnitCode(item.code, existing);

    const data: Prisma.ItemUnitCreateInput = {
      unitCode,
      serialNumber: input.serialNumber ?? null,
      brandModel: input.brandModel ?? item.brandModel ?? null,
      specs: input.specs ?? null,
      storageDetail: input.storageDetail ?? null,
      notes: input.notes ?? null,
      item: { connect: { id: item.id } },
      ...(input.condition ? { condition: input.condition } : {}),
      ...(input.locationId ? { location: { connect: { id: input.locationId } } } : {}),
    };

    const unit = await this.units.create(data);
    await this.recomputeItemCounts(item.id);
    return unit;
  }

  async updateUnit(unitCode: string, changes: UpdateUnitInput): Promise<ItemUnitWithRelations> {
    const unit = await this.units.findByCode(unitCode.trim());
    if (!unit) {
      throw new NotFoundException(`Unit ${unitCode} was not found.`);
    }

    const data: Prisma.ItemUnitUpdateInput = {};
    if (changes.condition != null) data.condition = changes.condition;
    if (changes.availabilityStatus != null) data.availabilityStatus = changes.availabilityStatus;
    if (changes.storageDetail !== undefined) data.storageDetail = changes.storageDetail;
    if (changes.notes !== undefined) data.notes = changes.notes;
    if (changes.locationId !== undefined) {
      data.location = changes.locationId
        ? { connect: { id: changes.locationId } }
        : { disconnect: true };
    }

    const updated = await this.units.update(unit.id, data);
    // Availability may have changed → keep the item's available count in sync.
    if (changes.availabilityStatus != null) {
      await this.recomputeItemCounts(unit.itemId);
    }
    return updated;
  }

  async archiveUnit(unitCode: string): Promise<ItemUnitWithRelations> {
    const unit = await this.units.findByCode(unitCode.trim());
    if (!unit) {
      throw new NotFoundException(`Unit ${unitCode} was not found.`);
    }
    const archived = await this.units.update(unit.id, { isArchived: true });
    await this.recomputeItemCounts(unit.itemId);
    return archived;
  }
}
