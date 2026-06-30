import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ItemWithRelations, itemInclude } from './inventory.types';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ItemCreateInput): Promise<ItemWithRelations> {
    return this.prisma.item.create({ data, include: itemInclude });
  }

  findByCode(code: string): Promise<ItemWithRelations | null> {
    return this.prisma.item.findUnique({
      where: { code },
      include: itemInclude,
    });
  }

  update(
    id: string,
    data: Prisma.ItemUpdateInput,
  ): Promise<ItemWithRelations> {
    return this.prisma.item.update({
      where: { id },
      data,
      include: itemInclude,
    });
  }

  /** Codes that share a prefix — used to compute the next sequence. */
  async codesWithPrefix(prefix: string): Promise<string[]> {
    const rows = await this.prisma.item.findMany({
      where: { code: { startsWith: prefix } },
      select: { code: true },
    });
    return rows.map((r) => r.code);
  }

  /**
   * Free-text search across name, code, and category name.
   * Archived items are excluded unless includeArchived is true.
   */
  search(
    query: string,
    options: { includeArchived?: boolean; limit?: number } = {},
  ): Promise<ItemWithRelations[]> {
    const { includeArchived = false, limit = 10 } = options;
    const contains: Prisma.StringFilter = { contains: query, mode: 'insensitive' };

    return this.prisma.item.findMany({
      where: {
        ...(includeArchived ? {} : { isArchived: false }),
        OR: [
          { name: contains },
          { code: contains },
          { category: { name: contains } },
          { location: { name: contains } },
        ],
      },
      include: itemInclude,
      orderBy: { name: 'asc' },
      take: limit,
    });
  }
}
