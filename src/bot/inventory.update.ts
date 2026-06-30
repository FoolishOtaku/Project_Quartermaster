import { UseGuards } from '@nestjs/common';
import { Command, Ctx, On, Update } from 'nestjs-telegraf';
import { User, UserRole } from '@prisma/client';
import { BotContext } from './bot.context';
import { BOT_MESSAGES } from './bot.messages';
import { ConversationService } from './conversation/conversation.service';
import { InventoryFlowService } from './flows/inventory-flow.service';
import { UnitFlowService, UNIT_FLOWS } from './flows/unit-flow.service';
import { BorrowingFlowService, BORROW_FLOWS } from './flows/borrowing-flow.service';
import { MenuService, MENU_CAPTURE_FLOWS } from './flows/menu.service';
import { RegistrationFlowService } from './flows/registration-flow.service';
import { RegistrationAdminService } from './registration/registration-admin.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  formatItemDetail,
  formatSearchResults,
  formatUnitDetail,
} from '../inventory/inventory.presenter';
import { TrackingType } from '@prisma/client';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CtxUser } from '../common/decorators/ctx-user.decorator';

@Update()
export class InventoryUpdate {
  constructor(
    private readonly inventory: InventoryService,
    private readonly flows: InventoryFlowService,
    private readonly unitFlows: UnitFlowService,
    private readonly borrowingFlows: BorrowingFlowService,
    private readonly menu: MenuService,
    private readonly registration: RegistrationFlowService,
    private readonly registrationAdmin: RegistrationAdminService,
    private readonly conversations: ConversationService,
  ) {}

  // ---- Menu ----------------------------------------------------------------

  /** /menu — interactive button menu for any registered user. */
  @UseGuards(RegisteredGuard)
  @Command('menu')
  async onMenu(@CtxUser() user: User, @Ctx() ctx: BotContext): Promise<void> {
    await this.menu.showMainMenu(ctx, user);
  }

  // ---- Item commands -------------------------------------------------------

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

  /** /view_item <code> — any registered user. Shows units for individual assets. */
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
    const units =
      item.trackingType === TrackingType.INDIVIDUAL_ASSET
        ? await this.inventory.listUnits(item.id)
        : undefined;
    await ctx.reply(formatItemDetail(item, units));
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

  // ---- Unit commands (individual assets) -----------------------------------

  /** /view_unit <unitCode> — any registered user. */
  @UseGuards(RegisteredGuard)
  @Command('view_unit')
  async onViewUnit(@Ctx() ctx: BotContext): Promise<void> {
    const code = this.getArgs(ctx);
    if (!code) {
      await ctx.reply(BOT_MESSAGES.VIEW_UNIT_USAGE);
      return;
    }
    const unit = await this.inventory.getUnitByCode(code);
    if (!unit) {
      await ctx.reply(BOT_MESSAGES.UNIT_NOT_FOUND);
      return;
    }
    await ctx.reply(formatUnitDetail(unit));
  }

  /** /add_unit [itemCode] — admin or assistant. */
  @Roles(UserRole.ADMIN, UserRole.ASSISTANT)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('add_unit')
  async onAddUnit(@Ctx() ctx: BotContext): Promise<void> {
    await this.unitFlows.startAddUnit(ctx, this.userId(ctx), this.getArgs(ctx));
  }

  /** /update_unit [unitCode] — admin or assistant. */
  @Roles(UserRole.ADMIN, UserRole.ASSISTANT)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('update_unit')
  async onUpdateUnit(@Ctx() ctx: BotContext): Promise<void> {
    await this.unitFlows.startUpdateUnit(ctx, this.userId(ctx), this.getArgs(ctx));
  }

  /** /archive_unit [unitCode] — admin only. */
  @Roles(UserRole.ADMIN)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('archive_unit')
  async onArchiveUnit(@Ctx() ctx: BotContext): Promise<void> {
    await this.unitFlows.startArchiveUnit(ctx, this.userId(ctx), this.getArgs(ctx));
  }

  // ---- Conversation routing ------------------------------------------------

  @On('text')
  async onText(@Ctx() ctx: BotContext): Promise<void> {
    const text = this.extractText(ctx);
    if (text.startsWith('/')) {
      return;
    }
    const userId = this.userId(ctx);
    if (!userId) {
      return;
    }
    const state = this.conversations.get(userId);
    if (!state) {
      return;
    }
    if (UNIT_FLOWS.includes(state.flow)) {
      await this.unitFlows.handleText(ctx, userId, text);
    } else if (BORROW_FLOWS.includes(state.flow)) {
      await this.borrowingFlows.handleText(ctx, userId, text);
    } else if (MENU_CAPTURE_FLOWS.includes(state.flow)) {
      await this.menu.handleText(ctx, userId, text);
    } else if (state.flow === 'REGISTER') {
      await this.registration.handleText(ctx, userId, text);
    } else {
      await this.flows.handleText(ctx, userId, text);
    }
  }

  @On('callback_query')
  async onCallback(@Ctx() ctx: BotContext): Promise<void> {
    const cb = ctx.callbackQuery;
    const data = cb && 'data' in cb ? cb.data : '';
    const userId = this.userId(ctx);
    if (!userId) {
      await ctx.answerCbQuery();
      return;
    }
    // Menu navigation/actions are handled first, regardless of any active flow.
    if (data.startsWith('qm|menu')) {
      await this.menu.handleCallback(ctx, userId, data);
      return;
    }
    // Main-admin registration/user-management panel.
    if (data.startsWith('qm|adm')) {
      await this.registrationAdmin.handleCallback(ctx, userId, data);
      return;
    }
    // Self-service registration (works for unregistered users).
    if (data.startsWith('qm|reg')) {
      await this.registration.handleCallback(ctx, userId, data);
      return;
    }
    const state = this.conversations.get(userId);
    if (state && UNIT_FLOWS.includes(state.flow)) {
      await this.unitFlows.handleCallback(ctx, userId, data ?? '');
    } else if (state && BORROW_FLOWS.includes(state.flow)) {
      await this.borrowingFlows.handleCallback(ctx, userId, data ?? '');
    } else if (state && MENU_CAPTURE_FLOWS.includes(state.flow)) {
      await this.menu.handleCaptureCallback(ctx, userId, data ?? '');
    } else {
      await this.flows.handleCallback(ctx, userId, data ?? '');
    }
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
