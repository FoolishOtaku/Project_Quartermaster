import { Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { BotContext } from '../bot.context';
import { BOT_MESSAGES } from '../bot.messages';
import { BotService } from '../bot.service';
import {
  ConversationService,
  ConversationState,
} from '../conversation/conversation.service';
import { InventoryService } from '../../inventory/inventory.service';
import { BorrowingService } from '../../borrowing/borrowing.service';
import { ReportsService } from '../../reports/reports.service';
import { isReportKind } from '../../reports/reports.types';
import { UsersService } from '../../users/users.service';
import {
  formatItemDetail,
  formatSearchResults,
  formatUnitDetail,
} from '../../inventory/inventory.presenter';
import { formatMyBorrowed, formatWhoHas } from '../../borrowing/borrowing.presenter';
import { TrackingType } from '@prisma/client';
import { Keyboards } from './keyboards';
import {
  MenuKeyboards,
  ReportKeyboards,
  canArchive,
  canBorrow,
  canManage,
  canReport,
} from './menu.keyboard';
import { InventoryFlowService } from './inventory-flow.service';
import { UnitFlowService } from './unit-flow.service';
import { BorrowingFlowService } from './borrowing-flow.service';

/** Single-step capture flows owned by the menu. */
export const MENU_CAPTURE_FLOWS = ['SEARCH', 'VIEW_ITEM', 'VIEW_UNIT', 'WHO_HAS'];

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly users: UsersService,
    private readonly conversations: ConversationService,
    private readonly inventory: InventoryService,
    private readonly borrowing: BorrowingService,
    private readonly reports: ReportsService,
    private readonly botService: BotService,
    private readonly inventoryFlows: InventoryFlowService,
    private readonly unitFlows: UnitFlowService,
    private readonly borrowingFlows: BorrowingFlowService,
  ) {}

  // ---- Menu rendering ------------------------------------------------------

  /** Show the main menu (used by /menu and /start's "Open menu" button). */
  async showMainMenu(ctx: BotContext, user: User, edit = false): Promise<void> {
    const text = `📋 *Quartermaster menu* — hi ${user.fullName}!\n\nTap an action below, or keep using slash commands.`;
    const keyboard = MenuKeyboards.main(user.role);
    if (edit) {
      try {
        await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
        return;
      } catch {
        // Original message can't be edited (too old / not a callback) — fall through.
      }
    }
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }

  // ---- Callback router (qm|menu|<action>) ----------------------------------

  async handleCallback(ctx: BotContext, userId: string, data: string): Promise<void> {
    await ctx.answerCbQuery();

    const user = await this.users.findByTelegramId(userId);
    if (!user || !user.isActive) {
      await ctx.reply(user ? BOT_MESSAGES.INACTIVE : BOT_MESSAGES.NOT_REGISTERED);
      return;
    }

    const action = data.split('|')[2] ?? '';

    try {
      switch (action) {
        case 'home':
          return await this.showMainMenu(ctx, user, true);
        case 'close':
          await this.clearMarkup(ctx);
          await ctx.reply('Menu closed. Send /menu anytime to reopen it.');
          return;
        case 'manage':
          return await this.showManageMenu(ctx, user);

        // Read actions — open to any registered user.
        case 'search':
          return await this.startCapture(ctx, userId, 'SEARCH', '🔍 Type a keyword to search (name, code, category, or location):');
        case 'view_item':
          return await this.startCapture(ctx, userId, 'VIEW_ITEM', '📄 Enter the item code to view (e.g. ASE-CABL-001):');
        case 'view_unit':
          return await this.startCapture(ctx, userId, 'VIEW_UNIT', '🔧 Enter the unit code to view (e.g. ASE-MON-001-U01):');
        case 'whohas':
          return await this.startCapture(ctx, userId, 'WHO_HAS', '👥 Enter the item code to see who currently has it:');
        case 'myborrowed': {
          const records = await this.borrowing.listActiveByUser(user.id);
          await ctx.reply(formatMyBorrowed(records));
          return;
        }
        case 'profile':
          await ctx.reply(this.botService.buildProfileMessage(user), { parse_mode: 'Markdown' });
          return;
        case 'help':
          await ctx.reply(BOT_MESSAGES.HELP, MenuKeyboards.openButton());
          return;

        // Reports — admin / coordinator / assistant.
        case 'reports':
          return await this.showReportsMenu(ctx, user);
        case 'rpt': {
          if (!this.ensure(ctx, canReport(user.role))) return;
          const kind = data.split('|')[3] ?? '';
          if (!isReportKind(kind)) return;
          const body = await this.reports.text(kind);
          await ctx.reply(body, ReportKeyboards.afterReport(kind));
          return;
        }
        case 'rcsv': {
          if (!this.ensure(ctx, canReport(user.role))) return;
          const kind = data.split('|')[3] ?? '';
          if (!isReportKind(kind)) return;
          const { filename, content } = await this.reports.csv(kind);
          await ctx.replyWithDocument(
            { source: Buffer.from(content, 'utf8'), filename },
            { caption: `${this.reports.title(kind)} — CSV export` },
          );
          return;
        }

        // Borrowing — everyone except VIEWER.
        case 'borrow':
          if (!this.ensure(ctx, canBorrow(user.role))) return;
          return await this.borrowingFlows.startBorrow(ctx, userId, '', {
            id: user.id,
            fullName: user.fullName,
          });
        case 'return':
          if (!this.ensure(ctx, canBorrow(user.role))) return;
          return await this.borrowingFlows.startReturn(ctx, userId, {
            id: user.id,
            fullName: user.fullName,
          });

        // Manage — admin / assistant.
        case 'add_item':
          if (!this.ensure(ctx, canManage(user.role))) return;
          return await this.inventoryFlows.startAddItem(ctx, userId, user.fullName);
        case 'update_item':
          if (!this.ensure(ctx, canManage(user.role))) return;
          return await this.inventoryFlows.startUpdateItem(ctx, userId, '');
        case 'add_unit':
          if (!this.ensure(ctx, canManage(user.role))) return;
          return await this.unitFlows.startAddUnit(ctx, userId, '');
        case 'update_unit':
          if (!this.ensure(ctx, canManage(user.role))) return;
          return await this.unitFlows.startUpdateUnit(ctx, userId, '');

        // Archive — admin only.
        case 'archive_item':
          if (!this.ensure(ctx, canArchive(user.role))) return;
          return await this.inventoryFlows.startArchiveItem(ctx, userId, '');
        case 'archive_unit':
          if (!this.ensure(ctx, canArchive(user.role))) return;
          return await this.unitFlows.startArchiveUnit(ctx, userId, '');

        default:
          // Unknown / stale menu button.
          return;
      }
    } catch (error) {
      this.logger.error(`Menu action "${action}" failed`, error as Error);
      await ctx.reply(BOT_MESSAGES.GENERIC_ERROR);
    }
  }

  private async showManageMenu(ctx: BotContext, user: User): Promise<void> {
    if (!this.ensure(ctx, canManage(user.role))) return;
    const text = '🛠 *Manage inventory*\n\nChoose what you want to do.';
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...MenuKeyboards.manage(user.role) });
    } catch {
      await ctx.reply(text, { parse_mode: 'Markdown', ...MenuKeyboards.manage(user.role) });
    }
  }

  private async showReportsMenu(ctx: BotContext, user: User): Promise<void> {
    if (!this.ensure(ctx, canReport(user.role))) return;
    const text = '📊 *Reports*\n\nPick a report to view. You can download any report as CSV afterwards.';
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...ReportKeyboards.list() });
    } catch {
      await ctx.reply(text, { parse_mode: 'Markdown', ...ReportKeyboards.list() });
    }
  }

  // ---- Capture flows (SEARCH / VIEW_ITEM / VIEW_UNIT / WHO_HAS) ------------

  private async startCapture(
    ctx: BotContext,
    userId: string,
    flow: 'SEARCH' | 'VIEW_ITEM' | 'VIEW_UNIT' | 'WHO_HAS',
    prompt: string,
  ): Promise<void> {
    this.conversations.start(userId, flow, {});
    await ctx.reply(prompt, Keyboards.cancelOnly());
  }

  /** Handle the one line of text a capture flow is waiting for. */
  async handleText(ctx: BotContext, userId: string, rawText: string): Promise<void> {
    const state = this.conversations.get(userId);
    if (!state) return;

    const text = rawText.trim();
    if (text.toLowerCase() === '/cancel' || text.toLowerCase() === 'cancel') {
      this.conversations.clear(userId);
      await ctx.reply('Cancelled.');
      return;
    }
    if (!text) {
      await ctx.reply('Please type a value, or tap Cancel.', Keyboards.cancelOnly());
      return;
    }

    try {
      switch (state.flow as ConversationState['flow']) {
        case 'SEARCH': {
          const items = await this.inventory.search(text);
          this.conversations.clear(userId);
          await ctx.reply(formatSearchResults(text, items));
          return;
        }
        case 'VIEW_ITEM': {
          const item = await this.inventory.getByCode(text);
          if (!item) {
            await ctx.reply(BOT_MESSAGES.ITEM_NOT_FOUND, Keyboards.cancelOnly());
            return;
          }
          const units =
            item.trackingType === TrackingType.INDIVIDUAL_ASSET
              ? await this.inventory.listUnits(item.id)
              : undefined;
          this.conversations.clear(userId);
          await ctx.reply(formatItemDetail(item, units));
          return;
        }
        case 'VIEW_UNIT': {
          const unit = await this.inventory.getUnitByCode(text);
          if (!unit) {
            await ctx.reply(BOT_MESSAGES.UNIT_NOT_FOUND, Keyboards.cancelOnly());
            return;
          }
          this.conversations.clear(userId);
          await ctx.reply(formatUnitDetail(unit));
          return;
        }
        case 'WHO_HAS': {
          const result = await this.borrowing.listActiveByItemCode(text);
          if (!result) {
            await ctx.reply(BOT_MESSAGES.ITEM_NOT_FOUND, Keyboards.cancelOnly());
            return;
          }
          this.conversations.clear(userId);
          await ctx.reply(formatWhoHas(result.item.name, result.records));
          return;
        }
      }
    } catch (error) {
      this.logger.error(`Capture flow ${state.flow} failed`, error as Error);
      this.conversations.clear(userId);
      await ctx.reply(BOT_MESSAGES.GENERIC_ERROR);
    }
  }

  /** Cancel handler for capture-flow callbacks (only the global Cancel button). */
  async handleCaptureCallback(ctx: BotContext, userId: string, data: string): Promise<void> {
    await ctx.answerCbQuery();
    if (data === 'qm|cancel') {
      await this.clearMarkup(ctx);
      this.conversations.clear(userId);
      await ctx.reply('Cancelled.');
    }
  }

  // ---- helpers -------------------------------------------------------------

  /** Returns true when allowed; otherwise replies with a denial and returns false. */
  private ensure(ctx: BotContext, allowed: boolean): boolean {
    if (!allowed) {
      void ctx.reply(BOT_MESSAGES.PERMISSION_DENIED);
    }
    return allowed;
  }

  private async clearMarkup(ctx: BotContext): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {
      // ignore
    }
  }
}
