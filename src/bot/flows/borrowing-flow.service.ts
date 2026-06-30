import { Injectable, Logger } from '@nestjs/common';
import { ReturnCondition, TrackingType } from '@prisma/client';
import { BotContext } from '../bot.context';
import {
  ConversationService,
  ConversationState,
} from '../conversation/conversation.service';
import { BorrowingService, Borrower } from '../../borrowing/borrowing.service';
import { InventoryService } from '../../inventory/inventory.service';
import {
  borrowLabel,
  formatBorrowConfirmation,
  formatReturnConfirmation,
} from '../../borrowing/borrowing.presenter';
import { Keyboards } from './keyboards';

export const BORROW_FLOWS = ['BORROW_ITEM', 'RETURN_ITEM'];

const RETURN_CONDITION_LABELS: Record<ReturnCondition, string> = {
  SAME_AS_BORROWED: 'Same as borrowed',
  GOOD: 'Good',
  DAMAGED: 'Damaged',
  MISSING: 'Missing',
  NEEDS_REPAIR: 'Needs Repair',
};

const SKIP_TOKENS = new Set(['-', 'skip', 'none', '']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function matchEnum<T extends string>(text: string, labels: Record<T, string>): T | null {
  const n = text.trim().toLowerCase();
  for (const key of Object.keys(labels) as T[]) {
    if (key.toLowerCase() === n || labels[key].toLowerCase() === n) return key;
  }
  return null;
}

// Borrow steps
const B = { CODE: 0, CHOOSE_UNIT: 1, QUANTITY: 2, PURPOSE: 3, DUE_DATE: 4, CONFIRM: 5 };
// Return steps
const R = { CHOOSE: 0, CONDITION: 1 };

@Injectable()
export class BorrowingFlowService {
  private readonly logger = new Logger(BorrowingFlowService.name);

  constructor(
    private readonly conversations: ConversationService,
    private readonly borrowing: BorrowingService,
    private readonly inventory: InventoryService,
  ) {}

  // ---- Entry points --------------------------------------------------------

  async startBorrow(ctx: BotContext, userId: string, codeArg: string, borrower: Borrower): Promise<void> {
    this.conversations.start(userId, 'BORROW_ITEM', {
      borrowerId: borrower.id,
      borrowerName: borrower.fullName,
    });
    if (codeArg) {
      await this.handleText(ctx, userId, codeArg);
    } else {
      await ctx.reply('📤 Borrow an item.\n\nEnter the item code, or a unit code (e.g. ASE-MON-001-U01):', Keyboards.cancelOnly());
    }
  }

  async startReturn(ctx: BotContext, userId: string, borrower: Borrower): Promise<void> {
    const records = await this.borrowing.listActiveByUser(borrower.id);
    if (records.length === 0) {
      await ctx.reply('You have no items to return.');
      return;
    }
    this.conversations.start(userId, 'RETURN_ITEM', {
      borrowerId: borrower.id,
      recordIds: records.map((r) => r.id),
    });
    await ctx.reply(
      'Which item are you returning?',
      Keyboards.returnRecords(records.map((r) => ({ id: r.id, label: borrowLabel(r) }))),
    );
  }

  // ---- Routers -------------------------------------------------------------

  async handleText(ctx: BotContext, userId: string, rawText: string): Promise<void> {
    const state = this.conversations.get(userId);
    if (!state) return;
    const text = rawText.trim();
    if (text.toLowerCase() === '/cancel' || text.toLowerCase() === 'cancel') {
      this.conversations.clear(userId);
      await ctx.reply('Cancelled.');
      return;
    }
    try {
      if (state.flow === 'BORROW_ITEM') return await this.borrowText(ctx, userId, state, text);
      if (state.flow === 'RETURN_ITEM') return await this.returnText(ctx, userId, state, text);
    } catch (error) {
      await this.fail(ctx, userId, state.flow, error);
    }
  }

  async handleCallback(ctx: BotContext, userId: string, data: string): Promise<void> {
    const parts = data.split('|');
    if (parts[0] !== 'qm') {
      await ctx.answerCbQuery();
      return;
    }
    await ctx.answerCbQuery();
    if (parts[1] === 'cancel') {
      await this.clearMarkup(ctx);
      this.conversations.clear(userId);
      await ctx.reply('Cancelled.');
      return;
    }
    const state = this.conversations.get(userId);
    if (!state) {
      await ctx.reply('That session has expired. Please start again.');
      return;
    }
    try {
      if (state.flow === 'BORROW_ITEM' && parts[1] === 'b') {
        return await this.borrowCallback(ctx, userId, state, parts[2], parts[3]);
      }
      if (state.flow === 'RETURN_ITEM' && parts[1] === 't') {
        return await this.returnCallback(ctx, userId, state, parts[2], parts[3]);
      }
    } catch (error) {
      await this.fail(ctx, userId, state.flow, error);
    }
  }

  // ---- BORROW --------------------------------------------------------------

  private async borrowText(ctx: BotContext, userId: string, state: ConversationState, text: string): Promise<void> {
    const data = state.data;
    const skipped = SKIP_TOKENS.has(text.toLowerCase());

    switch (state.step) {
      case B.CODE:
        return this.resolveBorrowCode(ctx, userId, state, text);

      case B.CHOOSE_UNIT: {
        const unit = await this.inventory.getUnitByCode(text);
        if (!unit || unit.availabilityStatus !== 'AVAILABLE' || unit.isArchived) {
          await ctx.reply('👆 Please tap an available unit button, or type a valid available unit code.');
          return;
        }
        data.unitCode = unit.unitCode;
        return this.advance(ctx, userId, state, B.PURPOSE, 'Purpose? Type it, or tap Skip.', Keyboards.skipCancel('b'));
      }

      case B.QUANTITY: {
        const qty = Number.parseInt(text, 10);
        const available = (data.available as number) ?? 0;
        if (!Number.isInteger(qty) || qty <= 0) {
          await ctx.reply('Enter a whole number of 1 or more.', Keyboards.cancelOnly());
          return;
        }
        if (qty > available) {
          await ctx.reply(`Only ${available} available. Enter ${available} or fewer.`, Keyboards.cancelOnly());
          return;
        }
        data.quantity = qty;
        return this.advance(ctx, userId, state, B.PURPOSE, 'Purpose? Type it, or tap Skip.', Keyboards.skipCancel('b'));
      }

      case B.PURPOSE:
        data.purpose = skipped ? null : text;
        return this.advance(ctx, userId, state, B.DUE_DATE, 'Expected return date? (YYYY-MM-DD) Type it, or tap Skip.', Keyboards.skipCancel('b'));

      case B.DUE_DATE: {
        if (skipped) {
          data.dueDate = null;
        } else if (DATE_RE.test(text)) {
          data.dueDate = text;
        } else {
          await ctx.reply('Please use the format YYYY-MM-DD (e.g. 2026-07-01), or tap Skip.', Keyboards.skipCancel('b'));
          return;
        }
        state.step = B.CONFIRM;
        this.conversations.set(userId, state);
        await ctx.reply(this.borrowSummary(data), Keyboards.confirmBorrow());
        return;
      }

      case B.CONFIRM:
        if (text.toLowerCase() === 'yes' || text.toLowerCase() === 'y') return this.finalizeBorrow(ctx, userId, state);
        if (text.toLowerCase() === 'no' || text.toLowerCase() === 'n') {
          this.conversations.clear(userId);
          await ctx.reply('Cancelled. Nothing was borrowed.');
          return;
        }
        await ctx.reply('👆 Please tap Confirm or Cancel.');
        return;
    }
  }

  private async borrowCallback(ctx: BotContext, userId: string, state: ConversationState, action: string, value: string): Promise<void> {
    const data = state.data;
    if (action === 'unit' && state.step === B.CHOOSE_UNIT) {
      const unit = await this.inventory.getUnitByCode(value);
      if (!unit || unit.availabilityStatus !== 'AVAILABLE' || unit.isArchived) {
        await ctx.reply('That unit is no longer available. Please choose another.');
        return;
      }
      await this.clearMarkup(ctx);
      data.unitCode = unit.unitCode;
      return this.advance(ctx, userId, state, B.PURPOSE, 'Purpose? Type it, or tap Skip.', Keyboards.skipCancel('b'));
    }
    if (action === 'skip' && state.step === B.PURPOSE) {
      await this.clearMarkup(ctx);
      data.purpose = null;
      return this.advance(ctx, userId, state, B.DUE_DATE, 'Expected return date? (YYYY-MM-DD) Type it, or tap Skip.', Keyboards.skipCancel('b'));
    }
    if (action === 'skip' && state.step === B.DUE_DATE) {
      await this.clearMarkup(ctx);
      data.dueDate = null;
      state.step = B.CONFIRM;
      this.conversations.set(userId, state);
      await ctx.reply(this.borrowSummary(data), Keyboards.confirmBorrow());
      return;
    }
    if (action === 'cfm' && state.step === B.CONFIRM) {
      await this.clearMarkup(ctx);
      if (value === 'yes') return this.finalizeBorrow(ctx, userId, state);
      this.conversations.clear(userId);
      await ctx.reply('Cancelled. Nothing was borrowed.');
    }
  }

  private async resolveBorrowCode(ctx: BotContext, userId: string, state: ConversationState, code: string): Promise<void> {
    const data = state.data;
    const item = await this.inventory.getByCode(code);
    if (item) {
      if (item.trackingType === TrackingType.INDIVIDUAL_ASSET) {
        const units = (await this.inventory.listUnits(item.id)).filter(
          (u) => u.availabilityStatus === 'AVAILABLE' && !u.isArchived,
        );
        if (units.length === 0) {
          this.conversations.clear(userId);
          await ctx.reply(`No available units for "${item.name}" right now.`);
          return;
        }
        data.itemName = item.name;
        return this.advance(
          ctx,
          userId,
          state,
          B.CHOOSE_UNIT,
          `"${item.name}" — choose a unit to borrow:`,
          Keyboards.borrowUnits(units.map((u) => ({ unitCode: u.unitCode }))),
        );
      }
      const available = item.quantityAvailable ?? 0;
      if (available <= 0) {
        this.conversations.clear(userId);
        await ctx.reply(`"${item.name}" has none available right now.`);
        return;
      }
      data.itemCode = item.code;
      data.itemName = item.name;
      data.available = available;
      return this.advance(ctx, userId, state, B.QUANTITY, `How many to borrow? (1–${available})`, Keyboards.cancelOnly());
    }

    const unit = await this.inventory.getUnitByCode(code);
    if (unit) {
      if (unit.availabilityStatus !== 'AVAILABLE' || unit.isArchived) {
        this.conversations.clear(userId);
        await ctx.reply(`Unit ${unit.unitCode} is not available right now.`);
        return;
      }
      data.unitCode = unit.unitCode;
      data.itemName = unit.item.name;
      return this.advance(ctx, userId, state, B.PURPOSE, 'Purpose? Type it, or tap Skip.', Keyboards.skipCancel('b'));
    }

    this.conversations.clear(userId);
    await ctx.reply(`I could not find an item or unit with code "${code}".`);
  }

  private borrowSummary(data: Record<string, unknown>): string {
    return [
      'Please confirm your borrow request:',
      '',
      `Item: ${data.itemName as string}`,
      data.unitCode ? `Unit: ${data.unitCode as string}` : `Quantity: ${data.quantity as number}`,
      data.purpose ? `Purpose: ${data.purpose as string}` : null,
      data.dueDate ? `Return by: ${data.dueDate as string}` : null,
    ]
      .filter((l): l is string => l !== null)
      .join('\n');
  }

  private async finalizeBorrow(ctx: BotContext, userId: string, state: ConversationState): Promise<void> {
    const data = state.data;
    const borrower: Borrower = {
      id: data.borrowerId as string,
      fullName: data.borrowerName as string,
    };
    const dueDate = data.dueDate ? new Date(`${data.dueDate as string}T00:00:00`) : null;
    const record = data.unitCode
      ? await this.borrowing.borrowUnit(data.unitCode as string, borrower, data.purpose as string | null, dueDate)
      : await this.borrowing.borrowQuantity(
          data.itemCode as string,
          borrower,
          data.quantity as number,
          data.purpose as string | null,
          dueDate,
        );
    this.conversations.clear(userId);
    await ctx.reply(formatBorrowConfirmation(record));
  }

  // ---- RETURN --------------------------------------------------------------

  private async returnText(ctx: BotContext, userId: string, state: ConversationState, text: string): Promise<void> {
    const data = state.data;
    if (state.step === R.CHOOSE) {
      const ids = (data.recordIds as string[]) ?? [];
      const idx = Number.parseInt(text, 10);
      if (!Number.isInteger(idx) || idx < 1 || idx > ids.length) {
        await ctx.reply('👆 Please tap one of the buttons above.');
        return;
      }
      return this.chooseReturn(ctx, userId, state, ids[idx - 1]);
    }
    if (state.step === R.CONDITION) {
      const cond = matchEnum<ReturnCondition>(text, RETURN_CONDITION_LABELS);
      if (!cond) {
        await ctx.reply('👆 Please tap a return-condition button.');
        return;
      }
      return this.finalizeReturn(ctx, userId, state, cond);
    }
  }

  private async returnCallback(ctx: BotContext, userId: string, state: ConversationState, action: string, value: string): Promise<void> {
    if (action === 'rec' && state.step === R.CHOOSE) {
      await this.clearMarkup(ctx);
      return this.chooseReturn(ctx, userId, state, value);
    }
    if (action === 'cond' && state.step === R.CONDITION) {
      await this.clearMarkup(ctx);
      return this.finalizeReturn(ctx, userId, state, value as ReturnCondition);
    }
  }

  private async chooseReturn(ctx: BotContext, userId: string, state: ConversationState, recordId: string): Promise<void> {
    const record = await this.borrowing.getActiveById(recordId);
    if (!record || record.returnedAt) {
      this.conversations.clear(userId);
      await ctx.reply('That borrow record is no longer active.');
      return;
    }
    state.data.recordId = record.id;
    if (record.itemUnit) {
      state.step = R.CONDITION;
      this.conversations.set(userId, state);
      await ctx.reply(`Returning ${record.itemUnit.unitCode}. What condition is it in?`, Keyboards.returnCondition());
      return;
    }
    // Quantity item — no per-unit condition; return immediately.
    return this.finalizeReturn(ctx, userId, state, null, record.id);
  }

  private async finalizeReturn(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    condition: ReturnCondition | null,
    recordIdOverride?: string,
  ): Promise<void> {
    const recordId = recordIdOverride ?? (state.data.recordId as string);
    const record = await this.borrowing.returnRecord(recordId, condition);
    this.conversations.clear(userId);
    await ctx.reply(formatReturnConfirmation(record));
  }

  // ---- helpers -------------------------------------------------------------

  private async advance(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    nextStep: number,
    prompt: string,
    keyboard: ReturnType<typeof Keyboards.cancelOnly>,
  ): Promise<void> {
    state.step = nextStep;
    this.conversations.set(userId, state);
    await ctx.reply(prompt, keyboard);
  }

  private async fail(ctx: BotContext, userId: string, flow: string, error: unknown): Promise<void> {
    this.logger.error(`Flow ${flow} failed`, error as Error);
    this.conversations.clear(userId);
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    await ctx.reply(`⚠️ ${message}`);
  }

  private async clearMarkup(ctx: BotContext): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {
      // ignore
    }
  }
}
