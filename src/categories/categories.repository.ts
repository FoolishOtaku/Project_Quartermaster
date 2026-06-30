import { Injectable } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' },
    });
  }

  findByNameInsensitive(name: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, isArchived: false },
    });
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }
}
