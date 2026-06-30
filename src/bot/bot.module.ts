import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { InventoryUpdate } from './inventory.update';
import { ConversationService } from './conversation/conversation.service';
import { InventoryFlowService } from './flows/inventory-flow.service';
import { UnitFlowService } from './flows/unit-flow.service';
import { UsersModule } from '../users/users.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CategoriesModule } from '../categories/categories.module';
import { LocationsModule } from '../locations/locations.module';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [UsersModule, InventoryModule, CategoriesModule, LocationsModule],
  providers: [
    BotUpdate,
    BotService,
    InventoryUpdate,
    ConversationService,
    InventoryFlowService,
    UnitFlowService,
    RegisteredGuard,
    RolesGuard,
  ],
})
export class BotModule {}
