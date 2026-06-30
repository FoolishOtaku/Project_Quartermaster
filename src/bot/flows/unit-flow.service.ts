import { Injectable, Logger } from '@nestjs/common';
import { AvailabilityStatus, ItemCondition } from '@prisma/client';
import { BotContext } from '../bot.context';
import {
  ConversationService,
  ConversationState,
} from '../conversation/conversation.service';
import { InventoryService } from '../../inventory/inventory.service';
import { LocationsService } from '../../locations/locations.service';
import {
  AVAILABILITY_LABELS,
  CONDITION_LABELS,
  formatUnitDetail,
} from '../../inventory/inventory.presenter';
import { UpdateUnitInput } from '../../inventory/inventory.types';
import { Keyboards } from './keyboards';

const SKIP_TOKENS = new Set(['-', 'skip', 'none', '']);

function matchEnum<T extends string>(text: string, labels: Record<T, string>): T | null {
  const n = text.trim().toLowerCase();
  for (const key of Object.keys(labels) as T[]) {
    if (key.toLowerCase() === n || labels[key].toLowerCase() === n) return key;
  }
  return null;
}

export const UNIT_FLOWS = ['ADD_UNIT', 'UPDATE_UNIT', 'ARCHIVE_UNIT'];

export const UPDATE_UNIT_FIELDS = [
  'Condition',
  'Availability',
  'Location',
  'Storage Detail',
  'Notes',
] as const;

@Injectable()
export class UnitFlowService {
  private readonly logger = new Logger(UnitFlowService.name);

  constructor(
    private readonly conversations: ConversationService,
    private readonly inventory: InventoryService,
    private readonly locations: LocationsService,
  ) {}

  // ---- Entry points --------------------------------------------------------

  async startAddUnit(ctx: BotContext, userId: string, codeArg: string): Promise<void> {
    this.conversations.start(userId, 'ADD_UNIT', {});
    if (codeArg) {
      await this.handleText(ctx, userId, codeArg);
    } else {
      await ctx.reply('➕ Add a unit.\n\nEnter the individual-asset item code (e.g. ASE-MON-001):', Keyboards.cancelOnly());
    }
  }

  async startUpdateUnit(ctx: BotContext, userId: string, codeArg: string): Promise<void> {
    this.conversations.start(userId, 'UPDATE_UNIT', {});
    if (codeArg) {
      await this.handleText(ctx, userId, codeArg);
    } else {
      await ctx.reply('✏️ Update a unit.\n\nEnter the unit code (e.g. ASE-MON-001-U01):', Keyboards.cancelOnly());
    }
  }

  async startArchiveUnit(ctx: BotContext, userId: string, codeArg: string): Promise<void> {
    this.conversations.start(userId, 'ARCHIVE_UNIT', {});
    if (codeArg) {
      await this.handleText(ctx, userId, codeArg);
    } else {
      await ctx.reply('🗄 Archive a unit.\n\nEnter the unit code to archive:', Keyboards.cancelOnly());
    }
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
      switch (state.flow) {
        case 'ADD_UNIT':
          return await this.addUnitText(ctx, userId, state, text);
        case 'UPDATE_UNIT':
          return await this.updateUnitText(ctx, userId, state, text);
        case 'ARCHIVE_UNIT':
          return await this.archiveUnitText(ctx, userId, state, text);
      }
    } catch (error) {
      this.logger.error(`Unit flow ${state.flow} (text) failed`, error as Error);
      this.conversations.clear(userId);
      await ctx.reply('Something went wrong. The operation was cancelled.');
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
      if (state.flow === 'ADD_UNIT' && parts[1] === 'n') {
        return await this.addUnitCallback(ctx, userId, state, parts[2], parts[3]);
      }
      if (state.flow === 'UPDATE_UNIT' && parts[1] === 'm') {
        return await this.updateUnitCallback(ctx, userId, state, parts[2], parts[3]);
      }
      if (state.flow === 'ARCHIVE_UNIT' && parts[1] === 'r') {
        return await this.archiveUnitCallback(ctx, userId, state, parts[2]);
      }
    } catch (error) {
      this.logger.error(`Unit flow ${state.flow} (callback) failed`, error as Error);
      this.conversations.clear(userId);
      await ctx.reply('Something went wrong. The operation was cancelled.');
    }
  }

  // ---- ADD_UNIT ------------------------------------------------------------
  // steps: 0 code, 1 serial, 2 condition, 3 location, 4 storage, 5 notes

  private async addUnitText(ctx: BotContext, userId: string, state: ConversationState, text: string): Promise<void> {
    const data = state.data;
    const skipped = SKIP_TOKENS.has(text.toLowerCase());

    switch (state.step) {
      case 0: {
        const item = await this.inventory.getByCode(text);
        if (!item) {
          this.conversations.clear(userId);
          await ctx.reply(`Item "${text}" was not found.`);
          return;
        }
        if (item.trackingType !== 'INDIVIDUAL_ASSET') {
          this.conversations.clear(userId);
          await ctx.reply(`"${item.name}" is not an individual-asset item. Use /update_item to change its quantity.`);
          return;
        }
        data.itemCode = item.code;
        data.itemName = item.name;
        return this.advance(ctx, userId, state, 1, 'Serial number? Type it, or tap Skip.', Keyboards.skipCancel('n'));
      }
      case 1:
        data.serial = skipped ? null : text;
        return this.advance(ctx, userId, state, 2, 'Condition of this unit?', Keyboards.condition('n'));
      case 2: {
        const cond = matchEnum<ItemCondition>(text, CONDITION_LABELS);
        if (!cond) {
          await ctx.reply('👆 Please tap a condition button.');
          return;
        }
        data.condition = cond;
        return this.advance(ctx, userId, state, 3, 'Where is this unit stored?', Keyboards.locations(await this.locations.listActive(), 'n'));
      }
      case 3: {
        const location = await this.locations.findByName(text);
        if (!location) {
          await ctx.reply('👆 Please tap a location, type an exact name, or tap Skip.');
          return;
        }
        data.locationId = location.id;
        return this.advance(ctx, userId, state, 4, 'Storage detail? Type it, or tap Skip.', Keyboards.skipCancel('n'));
      }
      case 4:
        data.storageDetail = skipped ? null : text;
        return this.advance(ctx, userId, state, 5, 'Any notes for this unit? Type them, or tap Skip.', Keyboards.skipCancel('n'));
      case 5:
        data.notes = skipped ? null : text;
        return this.finalizeAddUnit(ctx, userId, state);
    }
  }

  private async addUnitCallback(ctx: BotContext, userId: string, state: ConversationState, action: string, value: string): Promise<void> {
    const data = state.data;
    if (action === 'skip') {
      await this.clearMarkup(ctx);
      switch (state.step) {
        case 1:
          data.serial = null;
          return this.advance(ctx, userId, state, 2, 'Condition of this unit?', Keyboards.condition('n'));
        case 3:
          data.locationId = null;
          return this.advance(ctx, userId, state, 4, 'Storage detail? Type it, or tap Skip.', Keyboards.skipCancel('n'));
        case 4:
          data.storageDetail = null;
          return this.advance(ctx, userId, state, 5, 'Any notes for this unit? Type them, or tap Skip.', Keyboards.skipCancel('n'));
        case 5:
          data.notes = null;
          return this.finalizeAddUnit(ctx, userId, state);
      }
      return;
    }
    if (action === 'con' && state.step === 2) {
      await this.clearMarkup(ctx);
      data.condition = value as ItemCondition;
      return this.advance(ctx, userId, state, 3, 'Where is this unit stored?', Keyboards.locations(await this.locations.listActive(), 'n'));
    }
    if (action === 'loc' && state.step === 3) {
      const location = await this.locations.findById(value);
      if (!location) {
        await ctx.reply('That location is no longer available.');
        return;
      }
      await this.clearMarkup(ctx);
      data.locationId = location.id;
      return this.advance(ctx, userId, state, 4, 'Storage detail? Type it, or tap Skip.', Keyboards.skipCancel('n'));
    }
  }

  private async finalizeAddUnit(ctx: BotContext, userId: string, state: ConversationState): Promise<void> {
    const data = state.data;
    const unit = await this.inventory.addUnit(data.itemCode as string, {
      serialNumber: (data.serial as string | null) ?? null,
      condition: data.condition as ItemCondition,
      locationId: (data.locationId as string | null) ?? null,
      storageDetail: (data.storageDetail as string | null) ?? null,
      notes: (data.notes as string | null) ?? null,
    });
    this.conversations.clear(userId);
    await ctx.reply('✅ Unit added.\n\n' + formatUnitDetail(unit));
  }

  // ---- UPDATE_UNIT ---------------------------------------------------------
  // steps: 0 code, 1 field, 2 value

  private async updateUnitText(ctx: BotContext, userId: string, state: ConversationState, text: string): Promise<void> {
    const data = state.data;
    switch (state.step) {
      case 0: {
        const unit = await this.inventory.getUnitByCode(text);
        if (!unit) {
          this.conversations.clear(userId);
          await ctx.reply(`Unit "${text}" was not found.`);
          return;
        }
        data.unitCode = unit.unitCode;
        state.step = 1;
        this.conversations.set(userId, state);
        await ctx.reply(
          formatUnitDetail(unit) + '\n\nWhich field do you want to update?',
          Keyboards.updateUnitFields(UPDATE_UNIT_FIELDS),
        );
        return;
      }
      case 1: {
        const field = this.resolveField(text);
        if (!field) {
          await ctx.reply('👆 Please tap a field button.');
          return;
        }
        return this.promptUnitValue(ctx, userId, state, field);
      }
      case 2: {
        const field = data.field as (typeof UPDATE_UNIT_FIELDS)[number];
        const changes = await this.buildUnitUpdate(ctx, field, text);
        if (!changes) return;
        await this.applyUnitUpdate(ctx, userId, state, changes);
        return;
      }
    }
  }

  private async updateUnitCallback(ctx: BotContext, userId: string, state: ConversationState, action: string, value: string): Promise<void> {
    const data = state.data;
    if (action === 'fld' && state.step === 1) {
      const index = Number.parseInt(value, 10);
      if (!Number.isInteger(index) || index < 0 || index >= UPDATE_UNIT_FIELDS.length) return;
      await this.clearMarkup(ctx);
      return this.promptUnitValue(ctx, userId, state, UPDATE_UNIT_FIELDS[index]);
    }
    if (state.step !== 2) return;
    const field = data.field as (typeof UPDATE_UNIT_FIELDS)[number];
    if (action === 'con' && field === 'Condition') {
      await this.clearMarkup(ctx);
      return this.applyUnitUpdate(ctx, userId, state, { condition: value as ItemCondition });
    }
    if (action === 'avl' && field === 'Availability') {
      await this.clearMarkup(ctx);
      return this.applyUnitUpdate(ctx, userId, state, { availabilityStatus: value as AvailabilityStatus });
    }
    if (action === 'loc' && field === 'Location') {
      const location = await this.locations.findById(value);
      if (!location) {
        await ctx.reply('That location is no longer available.');
        return;
      }
      await this.clearMarkup(ctx);
      return this.applyUnitUpdate(ctx, userId, state, { locationId: location.id });
    }
    if (action === 'skip' && field === 'Location') {
      await this.clearMarkup(ctx);
      return this.applyUnitUpdate(ctx, userId, state, { locationId: null });
    }
  }

  private async promptUnitValue(ctx: BotContext, userId: string, state: ConversationState, field: (typeof UPDATE_UNIT_FIELDS)[number]): Promise<void> {
    state.data.field = field;
    state.step = 2;
    this.conversations.set(userId, state);
    switch (field) {
      case 'Condition':
        await ctx.reply('Choose the new condition:', Keyboards.condition('m'));
        return;
      case 'Availability':
        await ctx.reply('Choose the new availability:', Keyboards.availability('m'));
        return;
      case 'Location':
        await ctx.reply('Choose the new location:', Keyboards.locations(await this.locations.listActive(), 'm'));
        return;
      case 'Storage Detail':
        await ctx.reply('Enter the new storage detail (or "-" to clear):', Keyboards.cancelOnly());
        return;
      case 'Notes':
        await ctx.reply('Enter the new notes (or "-" to clear):', Keyboards.cancelOnly());
        return;
    }
  }

  private resolveField(text: string): (typeof UPDATE_UNIT_FIELDS)[number] | null {
    const idx = Number.parseInt(text, 10);
    if (Number.isInteger(idx) && idx >= 1 && idx <= UPDATE_UNIT_FIELDS.length) {
      return UPDATE_UNIT_FIELDS[idx - 1];
    }
    return UPDATE_UNIT_FIELDS.find((f) => f.toLowerCase() === text.trim().toLowerCase()) ?? null;
  }

  private async buildUnitUpdate(
    ctx: BotContext,
    field: (typeof UPDATE_UNIT_FIELDS)[number],
    text: string,
  ): Promise<UpdateUnitInput | null> {
    const skipped = SKIP_TOKENS.has(text.toLowerCase());
    switch (field) {
      case 'Condition': {
        const cond = matchEnum<ItemCondition>(text, CONDITION_LABELS);
        if (!cond) {
          await ctx.reply('👆 Please tap a condition button.');
          return null;
        }
        return { condition: cond };
      }
      case 'Availability': {
        const avail = matchEnum<AvailabilityStatus>(text, AVAILABILITY_LABELS);
        if (!avail) {
          await ctx.reply('👆 Please tap an availability button.');
          return null;
        }
        return { availabilityStatus: avail };
      }
      case 'Location': {
        if (skipped) return { locationId: null };
        const location = await this.locations.findByName(text);
        if (!location) {
          await ctx.reply('Location not found. Tap a button or type an exact name.');
          return null;
        }
        return { locationId: location.id };
      }
      case 'Storage Detail':
        return { storageDetail: skipped ? null : text };
      case 'Notes':
        return { notes: skipped ? null : text };
    }
  }

  private async applyUnitUpdate(ctx: BotContext, userId: string, state: ConversationState, changes: UpdateUnitInput): Promise<void> {
    const unit = await this.inventory.updateUnit(state.data.unitCode as string, changes);
    this.conversations.clear(userId);
    await ctx.reply('✅ Unit updated.\n\n' + formatUnitDetail(unit));
  }

  // ---- ARCHIVE_UNIT --------------------------------------------------------

  private async archiveUnitText(ctx: BotContext, userId: string, state: ConversationState, text: string): Promise<void> {
    const data = state.data;
    if (state.step === 0) {
      const unit = await this.inventory.getUnitByCode(text);
      if (!unit) {
        this.conversations.clear(userId);
        await ctx.reply(`Unit "${text}" was not found.`);
        return;
      }
      data.unitCode = unit.unitCode;
      state.step = 1;
      this.conversations.set(userId, state);
      await ctx.reply(`Archive unit ${unit.unitCode} (${unit.item.name})?`, Keyboards.confirmArchiveUnit());
      return;
    }
    if (state.step === 1) {
      if (text.toUpperCase() === 'YES') {
        return this.doArchiveUnit(ctx, userId, data.unitCode as string);
      }
      this.conversations.clear(userId);
      await ctx.reply('Cancelled. The unit was not archived.');
    }
  }

  private async archiveUnitCallback(ctx: BotContext, userId: string, state: ConversationState, action: string): Promise<void> {
    if (action === 'yes' && state.step === 1) {
      await this.clearMarkup(ctx);
      return this.doArchiveUnit(ctx, userId, state.data.unitCode as string);
    }
  }

  private async doArchiveUnit(ctx: BotContext, userId: string, unitCode: string): Promise<void> {
    const unit = await this.inventory.archiveUnit(unitCode);
    this.conversations.clear(userId);
    await ctx.reply(`✅ Archived unit ${unit.unitCode} (${unit.item.name}).`);
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

  private async clearMarkup(ctx: BotContext): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {
      // ignore
    }
  }
}
