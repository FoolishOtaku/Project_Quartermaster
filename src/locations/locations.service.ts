import { Injectable } from '@nestjs/common';
import { Location } from '@prisma/client';
import { LocationsRepository } from './locations.repository';

@Injectable()
export class LocationsService {
  constructor(private readonly repository: LocationsRepository) {}

  listActive(): Promise<Location[]> {
    return this.repository.listActive();
  }

  findByName(name: string): Promise<Location | null> {
    return this.repository.findByNameInsensitive(name.trim());
  }

  async listNames(): Promise<string[]> {
    const locations = await this.repository.listActive();
    return locations.map((l) => l.name);
  }
}
