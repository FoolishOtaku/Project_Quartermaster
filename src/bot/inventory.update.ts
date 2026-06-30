import { UseGuards } from '@nestjs/common';
import { Command, Ctx, On, Update } from 'nestjs-telegraf';
import { User, UserRole } from '@prisma/client';
import { BotContext } from './bot.context';
import { BOT_MESSAGES } from './bot.messages';
import { ConversationService } from './conversation/conversation.service';
import { InventoryFlowService } from './flows/inventory-flow.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  formatItemDetail,
  formatSearchResults,
} from '../inventory/inventory.presenter';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CtxUser } from '../common/decorators/ctx-user.decorator';

@Update()
export class InventoryUpdate {
  constructor(
    private readonly inventory: InventoryService,
    private readonly flows: InventoryFlowService,
    private readonly conversations: ConversationService,
  ) {}

  /** /search_item <keyword> — any registered user. */
  @UseGuards(RegisteredGuard)
  @Command('search_item')
  async onSearch(@Ctx() ctx: BotContext): Promise<void> {
    const query = this.getArgs(ctx);
    if (!query) {
      await ctx.reply(BOT_MESSAGES.SEARCH_USAGE);
      return;
    }
    const items = await this.inventory.search(query);
    await ctx.reply(formatSearchResults(query, items));
  }

  /** /view_item <code> — any registered user. */
  @UseGuards(RegisteredGuard)
  @Command('view_item')
  async onView(@Ctx() ctx: BotContext): Promise<void> {
    const code = this.getArgs(ctx);
    if (!code) {
      await ctx.reply(BOT_MESSAGES.VIEW_USAGE);
      return;
    }
    const item = await this.inventory.getByCode(code);
    if (!item) {
      await ctx.reply(BOT_MESSAGES.ITEM_NOT_FOUND);
      return;
    }
    await ctx.reply(formatItemDetail(item));
  }

  /** /add_item — admin or assistant. */
  @Roles(UserRole.ADMIN, UserRole.ASSISTANT)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('add_item')
  async onAdd(@CtxUser() user: User, @Ctx() ctx: BotContext): Promise<void> {
    await this.flows.startAddItem(ctx, this.userId(ctx), user.fullName);
  }

  /** /update_item [code] — admin or assistant. */
  @Roles(UserRole.ADMIN, UserRole.ASSISTANT)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('update_item')
  async onUpdate(@Ctx() ctx: BotContext): Promise<void> {
    await this.flows.startUpdateItem(ctx, this.userId(ctx), this.getArgs(ctx));
  }

  /** /archive_item [code] — admin only. */
  @Roles(UserRole.ADMIN)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('archive_item')
  async onArchive(@Ctx() ctx: BotContext): Promise<void> {
    await this.flows.startArchiveItem(ctx, this.userId(ctx), this.getArgs(ctx));
  }

  /**
   * Routes free-text messages into an active conversation flow.
   * Ignores commands (handled above) and idle chatter.
   */
  @On('text')
  async onText(@Ctx() ctx: BotContext): Promise<void> {
    const text = this.extractText(ctx);
    if (text.startsWith('/')) {
      return;
    }
    const userId = this.userId(ctx);
    if (!userId || !this.conversations.isActive(userId)) {
      return;
    }
    await this.flows.route(ctx, userId, text);
  }

  // ---- helpers -------------------------------------------------------------

  private userId(ctx: BotContext): string {
    return ctx.from?.id ? String(ctx.from.id) : '';
  }

  private extractText(ctx: BotContext): string {
    const msg = ctx.message;
    return msg && 'text' in msg ? msg.text : '';
  }

  private getArgs(ctx: BotContext): string {
    const text = this.extractText(ctx);
    const idx = text.indexOf(' ');
    return idx === -1 ? '' : text.slice(idx + 1).trim();
  }
}
