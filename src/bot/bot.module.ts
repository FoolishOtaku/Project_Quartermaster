import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { InventoryUpdate } from './inventory.update';
import { BorrowingUpdate } from './borrowing.update';
import { ConversationService } from './conversation/conversation.service';
import { InventoryFlowService } from './flows/inventory-flow.service';
import { UnitFlowService } from './flows/unit-flow.service';
import { BorrowingFlowService } from './flows/borrowing-flow.service';
import { UsersModule } from '../users/users.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CategoriesModule } from '../categories/categories.module';
import { LocationsModule } from '../locations/locations.module';
import { BorrowingModule } from '../borrowing/borrowing.module';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    InventoryModule,
    CategoriesModule,
    LocationsModule,
    BorrowingModule,
  ],
  providers: [
    BotUpdate,
    BotService,
    InventoryUpdate,
    BorrowingUpdate,
    ConversationService,
    InventoryFlowService,
    UnitFlowService,
    BorrowingFlowService,
    RegisteredGuard,
    RolesGuard,
  ],
})
export class BotModule {}
