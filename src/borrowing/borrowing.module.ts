import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { BorrowingService } from './borrowing.service';
import { BorrowingRepository } from './borrowing.repository';

@Module({
  imports: [InventoryModule],
  providers: [BorrowingService, BorrowingRepository],
  exports: [BorrowingService],
})
export class BorrowingModule {}
