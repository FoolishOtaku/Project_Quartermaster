import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ItemUnitRepository } from './item-unit.repository';

@Module({
  providers: [InventoryService, InventoryRepository, ItemUnitRepository],
  exports: [InventoryService],
})
export class InventoryModule {}
