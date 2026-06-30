import { UseGuards } from '@nestjs/common';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import { User, UserRole } from '@prisma/client';
import { BotContext } from './bot.context';
import { BorrowingFlowService } from './flows/borrowing-flow.service';
import { BorrowingService } from '../borrowing/borrowing.service';
import {
  formatMyBorrowed,
  formatWhoHas,
} from '../borrowing/borrowing.presenter';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CtxUser } from '../common/decorators/ctx-user.decorator';

/** Roles allowed to borrow/return (everyone except VIEWER). */
const BORROW_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.ASSISTANT,
  UserRole.TRUSTED_MEMBER,
];

@Update()
export class BorrowingUpdate {
  constructor(
    private readonly flows: BorrowingFlowService,
    private readonly borrowing: BorrowingService,
  ) {}

  /** /borrow_item [code] — borrowing roles. */
  @Roles(...BORROW_ROLES)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('borrow_item')
  async onBorrow(@CtxUser() user: User, @Ctx() ctx: BotContext): Promise<void> {
    await this.flows.startBorrow(ctx, this.userId(ctx), this.getArgs(ctx), {
      id: user.id,
      fullName: user.fullName,
    });
  }

  /** /return_item — borrowing roles. */
  @Roles(...BORROW_ROLES)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('return_item')
  async onReturn(@CtxUser() user: User, @Ctx() ctx: BotContext): Promise<void> {
    await this.flows.startReturn(ctx, this.userId(ctx), {
      id: user.id,
      fullName: user.fullName,
    });
  }

  /** /who_has <code> — any registered user. */
  @UseGuards(RegisteredGuard)
  @Command('who_has')
  async onWhoHas(@Ctx() ctx: BotContext): Promise<void> {
    const code = this.getArgs(ctx);
    if (!code) {
      await ctx.reply('Usage: /who_has <item code>\nExample: /who_has ASE-CABL-001');
      return;
    }
    const result = await this.borrowing.listActiveByItemCode(code);
    if (!result) {
      await ctx.reply('I could not find that item. Try another code.');
      return;
    }
    await ctx.reply(formatWhoHas(result.item.name, result.records));
  }

  /** /my_borrowed — any registered user (shows their own). */
  @UseGuards(RegisteredGuard)
  @Command('my_borrowed')
  async onMyBorrowed(@CtxUser() user: User, @Ctx() ctx: BotContext): Promise<void> {
    const records = await this.borrowing.listActiveByUser(user.id);
    await ctx.reply(formatMyBorrowed(records));
  }

  // ---- helpers -------------------------------------------------------------

  private userId(ctx: BotContext): string {
    return ctx.from?.id ? String(ctx.from.id) : '';
  }

  private getArgs(ctx: BotContext): string {
    const msg = ctx.message;
    const text = msg && 'text' in msg ? msg.text : '';
    const idx = text.indexOf(' ');
    return idx === -1 ? '' : text.slice(idx + 1).trim();
  }
}
