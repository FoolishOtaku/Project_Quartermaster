import { Injectable } from '@nestjs/common';
import {
  AvailabilityStatus,
  ItemCondition,
  OwnerSource,
  Prisma,
  TrackingType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ItemWithRelations, itemInclude } from '../inventory/inventory.types';
import { BorrowWithRelations, borrowInclude } from '../borrowing/borrowing.types';
import { InventorySummary, OwnershipBreakdown } from './reports.types';

/** Conditions/availabilities that count as "damaged" or "lost". */
const DAMAGED_CONDITIONS: ItemCondition[] = [ItemCondition.NEEDS_REPAIR, ItemCondition.BROKEN];

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Base filter: only active (non-archived) items. */
  private get activeItems(): Prisma.ItemWhereInput {
    return { isArchived: false };
  }

  private listItems(where: Prisma.ItemWhereInput): Promise<ItemWithRelations[]> {
    return this.prisma.item.findMany({
      where: { ...this.activeItems, ...where },
      include: itemInclude,
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  // ---- Summary -------------------------------------------------------------

  async summary(): Promise<InventorySummary> {
    const active = this.activeItems;
    const [
      totalItemTypes,
      bulkConsumableItems,
      individualAssetItems,
      totalUnitTrackedAssets,
      currentlyBorrowed,
      damagedItems,
      lostItems,
      unknownLocation,
      memberOwnedItems,
    ] = await Promise.all([
      this.prisma.item.count({ where: active }),
      this.prisma.item.count({
        where: { ...active, trackingType: { in: [TrackingType.BULK_STOCK, TrackingType.CONSUMABLE] } },
      }),
      this.prisma.item.count({ where: { ...active, trackingType: TrackingType.INDIVIDUAL_ASSET } }),
      this.prisma.itemUnit.count({ where: { isArchived: false } }),
      this.prisma.borrowRecord.count({ where: { returnedAt: null } }),
      this.prisma.item.count({ where: { ...active, ...this.damagedWhere() } }),
      this.prisma.item.count({ where: { ...active, ...this.lostWhere() } }),
      this.prisma.item.count({ where: { ...active, locationId: null } }),
      this.prisma.item.count({
        where: { ...active, ownerSource: { in: [OwnerSource.PERSONAL_LOAN, OwnerSource.DONATION] } },
      }),
    ]);

    const lowStockItems = (await this.lowStock()).length;
    const availableItems = await this.prisma.item.count({
      where: { ...active, availabilityStatus: AvailabilityStatus.AVAILABLE },
    });

    return {
      totalItemTypes,
      bulkConsumableItems,
      individualAssetItems,
      totalUnitTrackedAssets,
      availableItems,
      currentlyBorrowed,
      damagedItems,
      lostItems,
      unknownLocation,
      memberOwnedItems,
      lowStockItems,
    };
  }

  // ---- List reports --------------------------------------------------------

  borrowedActive(): Promise<BorrowWithRelations[]> {
    return this.prisma.borrowRecord.findMany({
      where: { returnedAt: null },
      include: borrowInclude,
      orderBy: { borrowedAt: 'asc' },
    });
  }

  private damagedWhere(): Prisma.ItemWhereInput {
    return {
      OR: [
        { condition: { in: DAMAGED_CONDITIONS } },
        { availabilityStatus: AvailabilityStatus.MAINTENANCE },
      ],
    };
  }

  private lostWhere(): Prisma.ItemWhereInput {
    return {
      OR: [{ condition: ItemCondition.LOST }, { availabilityStatus: AvailabilityStatus.MISSING }],
    };
  }

  damagedItems(): Promise<ItemWithRelations[]> {
    return this.listItems(this.damagedWhere());
  }

  lostItems(): Promise<ItemWithRelations[]> {
    return this.listItems(this.lostWhere());
  }

  unknownLocationItems(): Promise<ItemWithRelations[]> {
    return this.listItems({ locationId: null });
  }

  /**
   * Bulk / consumable items at or below their minimum stock. Prisma can't
   * compare two columns in a `where`, so we filter the candidate set in memory
   * (only items that actually set a minimumStock).
   */
  async lowStock(): Promise<ItemWithRelations[]> {
    const candidates = await this.listItems({
      trackingType: { in: [TrackingType.BULK_STOCK, TrackingType.CONSUMABLE] },
      minimumStock: { not: null },
    });
    return candidates.filter(
      (i) => (i.quantityAvailable ?? i.quantity ?? 0) <= (i.minimumStock ?? 0),
    );
  }

  /** Items whose warranty is expired or expires within `soonDays`. */
  warrantyItems(soonDays: number): Promise<ItemWithRelations[]> {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + soonDays);
    return this.listItems({ warrantyExpiry: { not: null, lte: horizon } });
  }

  /** Items whose scheduled next check is today or in the past. */
  maintenanceDueItems(): Promise<ItemWithRelations[]> {
    return this.listItems({ nextCheckDue: { not: null, lte: new Date() } });
  }

  async ownershipBreakdown(): Promise<OwnershipBreakdown> {
    const grouped = await this.prisma.item.groupBy({
      by: ['ownerSource'],
      where: this.activeItems,
      _count: { _all: true },
    });
    const result = {
      LAB_PURCHASE: 0,
      UNIVERSITY_ASSET: 0,
      DONATION: 0,
      PERSONAL_LOAN: 0,
      UNKNOWN: 0,
    } as OwnershipBreakdown;
    for (const row of grouped) {
      result[row.ownerSource] = row._count._all;
    }
    return result;
  }

  /** All active items (for the ownership CSV / full export). */
  allActiveItems(): Promise<ItemWithRelations[]> {
    return this.listItems({});
  }
}
