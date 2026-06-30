import { Injectable } from '@nestjs/common';
import { Category } from '@prisma/client';
import { CategoriesRepository } from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  listActive(): Promise<Category[]> {
    return this.repository.listActive();
  }

  findByName(name: string): Promise<Category | null> {
    return this.repository.findByNameInsensitive(name.trim());
  }

  findById(id: string): Promise<Category | null> {
    return this.repository.findById(id);
  }

  async listNames(): Promise<string[]> {
    const categories = await this.repository.listActive();
    return categories.map((c) => c.name);
  }
}
