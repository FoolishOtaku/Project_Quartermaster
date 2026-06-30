import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { InventoryUpdate } from './inventory.update';
import { BorrowingUpdate } from './borrowing.update';
import { ReportsUpdate } from './reports.update';
import { ConversationService } from './conversation/conversation.service';
import { InventoryFlowService } from './flows/inventory-flow.service';
import { UnitFlowService } from './flows/unit-flow.service';
import { BorrowingFlowService } from './flows/borrowing-flow.service';
import { MenuService } from './flows/menu.service';
import { UsersModule } from '../users/users.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CategoriesModule } from '../categories/categories.module';
import { LocationsModule } from '../locations/locations.module';
import { BorrowingModule } from '../borrowing/borrowing.module';
import { ReportsModule } from '../reports/reports.module';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    InventoryModule,
    CategoriesModule,
    LocationsModule,
    BorrowingModule,
    ReportsModule,
  ],
  providers: [
    BotUpdate,
    BotService,
    InventoryUpdate,
    BorrowingUpdate,
    ReportsUpdate,
    ConversationService,
    InventoryFlowService,
    UnitFlowService,
    BorrowingFlowService,
    MenuService,
    RegisteredGuard,
    RolesGuard,
  ],
})
export class BotModule {}
