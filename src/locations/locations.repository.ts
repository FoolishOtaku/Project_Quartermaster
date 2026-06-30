import { Injectable } from '@nestjs/common';
import { Location } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive(): Promise<Location[]> {
    return this.prisma.location.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' },
    });
  }

  findByNameInsensitive(name: string): Promise<Location | null> {
    return this.prisma.location.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, isArchived: false },
    });
  }

  findById(id: string): Promise<Location | null> {
    return this.prisma.location.findUnique({ where: { id } });
  }
}
