import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ItemUnitWithRelations, unitInclude } from './inventory.types';

@Injectable()
export class ItemUnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ItemUnitCreateInput): Promise<ItemUnitWithRelations> {
    return this.prisma.itemUnit.create({ data, include: unitInclude });
  }

  findByCode(unitCode: string): Promise<ItemUnitWithRelations | null> {
    return this.prisma.itemUnit.findUnique({
      where: { unitCode },
      include: unitInclude,
    });
  }

  update(id: string, data: Prisma.ItemUnitUpdateInput): Promise<ItemUnitWithRelations> {
    return this.prisma.itemUnit.update({ where: { id }, data, include: unitInclude });
  }

  /** Active (non-archived) units for an item. */
  listByItemId(itemId: string): Promise<ItemUnitWithRelations[]> {
    return this.prisma.itemUnit.findMany({
      where: { itemId, isArchived: false },
      include: unitInclude,
      orderBy: { unitCode: 'asc' },
    });
  }

  /** All unit codes for an item (including archived) — used for code generation. */
  async unitCodesByItemId(itemId: string): Promise<string[]> {
    const rows = await this.prisma.itemUnit.findMany({
      where: { itemId },
      select: { unitCode: true },
    });
    return rows.map((r) => r.unitCode);
  }

  /** Counts used to keep the parent item's quantity fields in sync. */
  async countsByItemId(itemId: string): Promise<{ total: number; available: number }> {
    const [total, available] = await Promise.all([
      this.prisma.itemUnit.count({ where: { itemId, isArchived: false } }),
      this.prisma.itemUnit.count({
        where: { itemId, isArchived: false, availabilityStatus: 'AVAILABLE' },
      }),
    ]);
    return { total, available };
  }
}
