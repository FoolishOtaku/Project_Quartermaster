import { UseGuards } from '@nestjs/common';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import { User } from '@prisma/client';
import { BotContext } from './bot.context';
import { RegistrationFlowService } from './flows/registration-flow.service';
import { RegistrationAdminService } from './registration/registration-admin.service';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { CtxUser } from '../common/decorators/ctx-user.decorator';

@Update()
export class RegistrationUpdate {
  constructor(
    private readonly flow: RegistrationFlowService,
    private readonly admin: RegistrationAdminService,
  ) {}

  /** /register — open to everyone (the whole point is unregistered users). */
  @Command('register')
  async onRegister(@Ctx() ctx: BotContext): Promise<void> {
    const telegramId = ctx.from?.id ? String(ctx.from.id) : '';
    if (!telegramId) return;
    await this.flow.begin(ctx, telegramId);
  }

  /** /requests — main-admin-only review panel (RegisteredGuard then main-admin check). */
  @UseGuards(RegisteredGuard)
  @Command('requests')
  async onRequests(@CtxUser() user: User, @Ctx() ctx: BotContext): Promise<void> {
    await this.admin.openPanel(ctx, user.telegramId);
  }
}
