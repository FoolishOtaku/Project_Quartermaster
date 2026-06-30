import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { UsersModule } from '../users/users.module';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [UsersModule],
  providers: [BotUpdate, BotService, RegisteredGuard, RolesGuard],
})
export class BotModule {}
