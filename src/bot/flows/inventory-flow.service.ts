import { Injectable, Logger } from '@nestjs/common';
import {
  AvailabilityStatus,
  ItemCondition,
  OwnerSource,
  TrackingType,
} from '@prisma/client';
import { BotContext } from '../bot.context';
import {
  ConversationService,
  ConversationState,
} from '../conversation/conversation.service';
import { InventoryService } from '../../inventory/inventory.service';
import { CategoriesService } from '../../categories/categories.service';
import { LocationsService } from '../../locations/locations.service';
import {
  AVAILABILITY_LABELS,
  CONDITION_LABELS,
  OWNER_SOURCE_LABELS,
  TRACKING_TYPE_LABELS,
  formatItemDetail,
} from '../../inventory/inventory.presenter';
import { UpdateItemInput } from '../../inventory/inventory.types';
import { Keyboards } from './keyboards';

const SKIP_TOKENS = new Set(['-', 'skip', 'none', '']);

/** Invert a label map to resolve user text back to an enum key. */
function matchEnum<T extends string>(
  text: string,
  labels: Record<T, string>,
): T | null {
  const normalized = text.trim().toLowerCase();
  for (const key of Object.keys(labels) as T[]) {
    if (key.toLowerCase() === normalized || labels[key].toLowerCase() === normalized) {
      return key;
    }
  }
  return null;
}

export const UPDATE_FIELDS = [
  'Name',
  'Quantity',
  'Minimum Stock',
  'Unit',
  'Location',
  'Storage Detail',
  'Condition',
  'Availability',
  'Owner / Source',
  'Notes',
] as const;

// Add-flow step indices.
const STEP = {
  NAME: 0,
  CATEGORY: 1,
  TRACKING: 2,
  QUANTITY: 3,
  UNIT: 4,
  MIN_STOCK: 5,
  LOCATION: 6,
  STORAGE: 7,
  CONDITION: 8,
  OWNER: 9,
  NOTES: 10,
  CONFIRM: 11,
};

const OPTIONAL_ADD_STEPS = new Set([
  STEP.UNIT,
  STEP.MIN_STOCK,
  STEP.LOCATION,
  STEP.STORAGE,
  STEP.NOTES,
]);

@Injectable()
export class InventoryFlowService {
  private readonly logger = new Logger(InventoryFlowService.name);

  constructor(
    private readonly conversations: ConversationService,
    private readonly inventory: InventoryService,
    private readonly categories: CategoriesService,
    private readonly locations: LocationsService,
  ) {}

  // ---- Entry points --------------------------------------------------------

  async startAddItem(ctx: BotContext, userId: string, pic: string): Promise<void> {
    const state = this.conversations.start(userId, 'ADD_ITEM', { pic });
    await this.sendAddStep(ctx, state);
  }

  async startUpdateItem(ctx: BotContext, userId: string, codeArg: string): Promise<void> {
    this.conversations.start(userId, 'UPDATE_ITEM', {});
    if (codeArg) {
      await this.handleText(ctx, userId, codeArg);
    } else {
      await ctx.reply('✏️ Update an item.\n\nEnter the item code (e.g. ASE-CAB-001):', Keyboards.cancelOnly());
    }
  }

  async startArchiveItem(ctx: BotContext, userId: string, codeArg: string): Promise<void> {
    this.conversations.start(userId, 'ARCHIVE_ITEM', {});
    if (codeArg) {
      await this.handleText(ctx, userId, codeArg);
    } else {
      await ctx.reply('🗄 Archive an item.\n\nEnter the item code to archive:', Keyboards.cancelOnly());
    }
  }

  // ---- Text router ---------------------------------------------------------

  async handleText(ctx: BotContext, userId: string, rawText: string): Promise<void> {
    const state = this.conversations.get(userId);
    if (!state) return;

    const text = rawText.trim();
    if (text.toLowerCase() === '/cancel' || text.toLowerCase() === 'cancel') {
      return this.cancel(ctx, userId);
    }

    try {
      switch (state.flow) {
        case 'ADD_ITEM':
          return await this.addText(ctx, userId, state, text);
        case 'UPDATE_ITEM':
          return await this.updateText(ctx, userId, state, text);
        case 'ARCHIVE_ITEM':
          return await this.archiveText(ctx, userId, state, text);
      }
    } catch (error) {
      this.logger.error(`Flow ${state.flow} (text) failed`, error as Error);
      this.conversations.clear(userId);
      await ctx.reply('Something went wrong. The operation was cancelled.');
    }
  }

  // ---- Callback router -----------------------------------------------------

  async handleCallback(ctx: BotContext, userId: string, data: string): Promise<void> {
    const parts = data.split('|');
    if (parts[0] !== 'qm') {
      await ctx.answerCbQuery();
      return;
    }
    await ctx.answerCbQuery();

    if (parts[1] === 'cancel') {
      await this.clearMarkup(ctx);
      return this.cancel(ctx, userId);
    }

    const state = this.conversations.get(userId);
    if (!state) {
      await ctx.reply('That session has expired. Please start again.');
      return;
    }

    try {
      if (state.flow === 'ADD_ITEM' && parts[1] === 'a') {
        return await this.addCallback(ctx, userId, state, parts[2], parts[3]);
      }
      if (state.flow === 'UPDATE_ITEM' && parts[1] === 'u') {
        return await this.updateCallback(ctx, userId, state, parts[2], parts[3]);
      }
      if (state.flow === 'ARCHIVE_ITEM' && parts[1] === 'x') {
        return await this.archiveCallback(ctx, userId, state, parts[2]);
      }
      // Stale button from a different/finished step — ignore quietly.
    } catch (error) {
      this.logger.error(`Flow ${state.flow} (callback) failed`, error as Error);
      this.conversations.clear(userId);
      await ctx.reply('Something went wrong. The operation was cancelled.');
    }
  }

  // ---- ADD: prompts --------------------------------------------------------

  private async sendAddStep(ctx: BotContext, state: ConversationState): Promise<void> {
    switch (state.step) {
      case STEP.NAME:
        await ctx.reply('🆕 *New item* — Step 1 of 11\n\nWhat is the item name?', {
          parse_mode: 'Markdown',
          ...Keyboards.cancelOnly(),
        });
        return;
      case STEP.CATEGORY:
        await ctx.reply('Step 2 of 11\n\nChoose a category:', Keyboards.categories(await this.categories.listActive()));
        return;
      case STEP.TRACKING:
        await ctx.reply('Step 3 of 11\n\nChoose a tracking type:', Keyboards.tracking());
        return;
      case STEP.QUANTITY:
        await ctx.reply('Step 4 of 11\n\nHow many are there? Enter a whole number.', Keyboards.cancelOnly());
        return;
      case STEP.UNIT:
        await ctx.reply('Step 5 of 11\n\nUnit? (e.g. pcs, set, box). Type it, or tap Skip.', Keyboards.skipCancel());
        return;
      case STEP.MIN_STOCK:
        await ctx.reply('Step 6 of 11\n\nMinimum stock level for low-stock alerts? Enter a number, or tap Skip.', Keyboards.skipCancel());
        return;
      case STEP.LOCATION:
        await ctx.reply('Step 7 of 11\n\nWhere is it stored? Choose a location, or tap Skip.', Keyboards.locations(await this.locations.listActive()));
        return;
      case STEP.STORAGE:
        await ctx.reply('Step 8 of 11\n\nStorage detail? (e.g. "HDMI section"). Type it, or tap Skip.', Keyboards.skipCancel());
        return;
      case STEP.CONDITION:
        await ctx.reply('Step 9 of 11\n\nWhat condition is it in?', Keyboards.condition());
        return;
      case STEP.OWNER:
        await ctx.reply('Step 10 of 11\n\nOwner / source?', Keyboards.ownerSource());
        return;
      case STEP.NOTES:
        await ctx.reply('Step 11 of 11\n\nAny notes? Type them, or tap Skip.', Keyboards.skipCancel());
        return;
      case STEP.CONFIRM:
        await ctx.reply('Please review the new item:\n\n' + this.addSummary(state.data), Keyboards.confirmAdd());
        return;
    }
  }

  // ---- ADD: text input -----------------------------------------------------

  private async addText(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    text: string,
  ): Promise<void> {
    const data = state.data;
    const skipped = SKIP_TOKENS.has(text.toLowerCase());

    switch (state.step) {
      case STEP.NAME:
        if (!text) {
          await ctx.reply('The name cannot be empty. What is the item name?', Keyboards.cancelOnly());
          return;
        }
        data.name = text;
        return this.addAdvance(ctx, userId, state, STEP.CATEGORY);

      case STEP.CATEGORY: {
        const category = await this.categories.findByName(text);
        if (!category) {
          await ctx.reply('👆 Please tap a category button, or type an exact category name.');
          return;
        }
        return this.setCategory(ctx, userId, state, category.id, category.name);
      }

      case STEP.TRACKING: {
        const tracking = matchEnum<TrackingType>(text, TRACKING_TYPE_LABELS);
        if (tracking !== TrackingType.BULK_STOCK && tracking !== TrackingType.CONSUMABLE) {
          await ctx.reply('👆 Please tap Bulk Stock or Consumable.');
          return;
        }
        return this.setTracking(ctx, userId, state, tracking);
      }

      case STEP.QUANTITY: {
        const qty = Number.parseInt(text, 10);
        if (!Number.isInteger(qty) || qty < 0) {
          await ctx.reply('Quantity must be a whole number of 0 or more.', Keyboards.cancelOnly());
          return;
        }
        data.quantity = qty;
        return this.addAdvance(ctx, userId, state, STEP.UNIT);
      }

      case STEP.UNIT:
        data.unit = skipped ? null : text;
        return this.addAdvance(ctx, userId, state, STEP.MIN_STOCK);

      case STEP.MIN_STOCK: {
        if (skipped) {
          data.minimumStock = null;
        } else {
          const min = Number.parseInt(text, 10);
          if (!Number.isInteger(min) || min < 0) {
            await ctx.reply('Minimum stock must be a whole number of 0 or more, or tap Skip.', Keyboards.skipCancel());
            return;
          }
          data.minimumStock = min;
        }
        return this.addAdvance(ctx, userId, state, STEP.LOCATION);
      }

      case STEP.LOCATION: {
        const location = await this.locations.findByName(text);
        if (!location) {
          await ctx.reply('👆 Please tap a location button, type an exact location name, or tap Skip.');
          return;
        }
        return this.setLocation(ctx, userId, state, location.id);
      }

      case STEP.STORAGE:
        data.storageDetail = skipped ? null : text;
        return this.addAdvance(ctx, userId, state, STEP.CONDITION);

      case STEP.CONDITION: {
        const cond = matchEnum<ItemCondition>(text, CONDITION_LABELS);
        if (!cond) {
          await ctx.reply('👆 Please tap a condition button.');
          return;
        }
        return this.setCondition(ctx, userId, state, cond);
      }

      case STEP.OWNER: {
        const owner = matchEnum<OwnerSource>(text, OWNER_SOURCE_LABELS);
        if (!owner) {
          await ctx.reply('👆 Please tap an owner / source button.');
          return;
        }
        return this.setOwner(ctx, userId, state, owner);
      }

      case STEP.NOTES:
        data.notes = skipped ? null : text;
        return this.addAdvance(ctx, userId, state, STEP.CONFIRM);

      case STEP.CONFIRM:
        if (text.toLowerCase() === 'yes' || text.toLowerCase() === 'y') {
          return this.finalizeAdd(ctx, userId, state);
        }
        if (text.toLowerCase() === 'no' || text.toLowerCase() === 'n') {
          return this.cancelAdd(ctx, userId);
        }
        await ctx.reply('👆 Please tap Confirm or Cancel.');
        return;
    }
  }

  // ---- ADD: callbacks ------------------------------------------------------

  private async addCallback(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    action: string,
    value: string,
  ): Promise<void> {
    if (action === 'skip') {
      if (!OPTIONAL_ADD_STEPS.has(state.step)) {
        return; // stale skip button
      }
      await this.clearMarkup(ctx);
      const data = state.data;
      switch (state.step) {
        case STEP.UNIT:
          data.unit = null;
          return this.addAdvance(ctx, userId, state, STEP.MIN_STOCK);
        case STEP.MIN_STOCK:
          data.minimumStock = null;
          return this.addAdvance(ctx, userId, state, STEP.LOCATION);
        case STEP.LOCATION:
          data.locationId = null;
          return this.addAdvance(ctx, userId, state, STEP.STORAGE);
        case STEP.STORAGE:
          data.storageDetail = null;
          return this.addAdvance(ctx, userId, state, STEP.CONDITION);
        case STEP.NOTES:
          data.notes = null;
          return this.addAdvance(ctx, userId, state, STEP.CONFIRM);
      }
      return;
    }

    if (action === 'cat' && state.step === STEP.CATEGORY) {
      const category = await this.categories.findById(value);
      if (!category) {
        await ctx.reply('That category is no longer available. Please choose another.');
        return;
      }
      await this.clearMarkup(ctx);
      return this.setCategory(ctx, userId, state, category.id, category.name);
    }

    if (action === 'trk' && state.step === STEP.TRACKING) {
      await this.clearMarkup(ctx);
      return this.setTracking(ctx, userId, state, value as TrackingType);
    }

    if (action === 'loc' && state.step === STEP.LOCATION) {
      const location = await this.locations.findById(value);
      if (!location) {
        await ctx.reply('That location is no longer available. Please choose another.');
        return;
      }
      await this.clearMarkup(ctx);
      return this.setLocation(ctx, userId, state, location.id);
    }

    if (action === 'con' && state.step === STEP.CONDITION) {
      await this.clearMarkup(ctx);
      return this.setCondition(ctx, userId, state, value as ItemCondition);
    }

    if (action === 'own' && state.step === STEP.OWNER) {
      await this.clearMarkup(ctx);
      return this.setOwner(ctx, userId, state, value as OwnerSource);
    }

    if (action === 'cfm' && state.step === STEP.CONFIRM) {
      await this.clearMarkup(ctx);
      if (value === 'yes') {
        return this.finalizeAdd(ctx, userId, state);
      }
      return this.cancelAdd(ctx, userId);
    }
    // Otherwise: stale button, ignore.
  }

  // ---- ADD: shared setters -------------------------------------------------

  private setCategory(ctx: BotContext, userId: string, state: ConversationState, id: string, name: string) {
    state.data.categoryId = id;
    state.data.categoryName = name;
    return this.addAdvance(ctx, userId, state, STEP.TRACKING);
  }

  private setTracking(ctx: BotContext, userId: string, state: ConversationState, tracking: TrackingType) {
    state.data.trackingType = tracking;
    return this.addAdvance(ctx, userId, state, STEP.QUANTITY);
  }

  private setLocation(ctx: BotContext, userId: string, state: ConversationState, id: string) {
    state.data.locationId = id;
    return this.addAdvance(ctx, userId, state, STEP.STORAGE);
  }

  private setCondition(ctx: BotContext, userId: string, state: ConversationState, cond: ItemCondition) {
    state.data.condition = cond;
    return this.addAdvance(ctx, userId, state, STEP.OWNER);
  }

  private setOwner(ctx: BotContext, userId: string, state: ConversationState, owner: OwnerSource) {
    state.data.ownerSource = owner;
    return this.addAdvance(ctx, userId, state, STEP.NOTES);
  }

  private async addAdvance(ctx: BotContext, userId: string, state: ConversationState, nextStep: number): Promise<void> {
    state.step = nextStep;
    this.conversations.set(userId, state);
    await this.sendAddStep(ctx, state);
  }

  private async finalizeAdd(ctx: BotContext, userId: string, state: ConversationState): Promise<void> {
    const data = state.data;
    const item = await this.inventory.createItem({
      name: data.name as string,
      categoryId: data.categoryId as string,
      categoryName: data.categoryName as string,
      trackingType: data.trackingType as TrackingType,
      quantity: data.quantity as number,
      unit: (data.unit as string | null) ?? null,
      minimumStock: (data.minimumStock as number | null) ?? null,
      locationId: (data.locationId as string | null) ?? null,
      storageDetail: (data.storageDetail as string | null) ?? null,
      condition: data.condition as ItemCondition,
      ownerSource: data.ownerSource as OwnerSource,
      responsiblePic: (data.pic as string | null) ?? null,
      notes: (data.notes as string | null) ?? null,
    });
    this.conversations.clear(userId);
    await ctx.reply('✅ Item created successfully.\n\n' + formatItemDetail(item));
  }

  private async cancelAdd(ctx: BotContext, userId: string): Promise<void> {
    this.conversations.clear(userId);
    await ctx.reply('Cancelled. No item was created.');
  }

  private addSummary(data: Record<string, unknown>): string {
    return [
      `Name: ${data.name as string}`,
      `Category: ${data.categoryName as string}`,
      `Tracking: ${TRACKING_TYPE_LABELS[data.trackingType as TrackingType]}`,
      `Quantity: ${data.quantity as number}${data.unit ? ` ${data.unit as string}` : ''}`,
      data.minimumStock != null ? `Minimum Stock: ${data.minimumStock as number}` : null,
      data.locationId ? null : 'Location: Unknown',
      data.storageDetail ? `Storage Detail: ${data.storageDetail as string}` : null,
      `Condition: ${CONDITION_LABELS[data.condition as ItemCondition]}`,
      `Owner / Source: ${OWNER_SOURCE_LABELS[data.ownerSource as OwnerSource]}`,
      data.notes ? `Notes: ${data.notes as string}` : null,
    ]
      .filter((l): l is string => l !== null)
      .join('\n');
  }

  // ---- UPDATE --------------------------------------------------------------

  private async updateText(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    text: string,
  ): Promise<void> {
    const data = state.data;

    if (state.step === 0) {
      const item = await this.inventory.getByCode(text);
      if (!item) {
        this.conversations.clear(userId);
        await ctx.reply(`Item "${text}" was not found.`);
        return;
      }
      data.code = item.code;
      state.step = 1;
      this.conversations.set(userId, state);
      await ctx.reply(
        formatItemDetail(item) + '\n\nWhich field do you want to update?',
        Keyboards.updateFields(UPDATE_FIELDS),
      );
      return;
    }

    if (state.step === 1) {
      const field = this.resolveUpdateField(text);
      if (!field) {
        await ctx.reply('👆 Please tap a field button.');
        return;
      }
      return this.promptUpdateValue(ctx, userId, state, field);
    }

    if (state.step === 2) {
      const field = data.field as (typeof UPDATE_FIELDS)[number];
      const changes = await this.buildUpdate(ctx, field, text);
      if (!changes) return;
      const item = await this.inventory.updateItem(data.code as string, changes);
      this.conversations.clear(userId);
      await ctx.reply('✅ Item updated.\n\n' + formatItemDetail(item));
    }
  }

  private async updateCallback(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    action: string,
    value: string,
  ): Promise<void> {
    if (action === 'fld' && state.step === 1) {
      const index = Number.parseInt(value, 10);
      if (!Number.isInteger(index) || index < 0 || index >= UPDATE_FIELDS.length) {
        return;
      }
      await this.clearMarkup(ctx);
      return this.promptUpdateValue(ctx, userId, state, UPDATE_FIELDS[index]);
    }
  }

  private async promptUpdateValue(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    field: (typeof UPDATE_FIELDS)[number],
  ): Promise<void> {
    state.data.field = field;
    state.step = 2;
    this.conversations.set(userId, state);

    const hints: Partial<Record<(typeof UPDATE_FIELDS)[number], string>> = {
      Condition: ' (New / Good / Fair / Needs Repair / Broken / Lost / Unknown)',
      Availability: ' (Available / In Use / Borrowed / Maintenance / Missing / Retired / Disposed)',
      'Owner / Source': ' (Lab Purchase / University Asset / Donation / Personal Loan / Unknown)',
      Location: ' (type the location name, or "-" to clear)',
      Quantity: ' (whole number)',
      'Minimum Stock': ' (whole number, or "-" to clear)',
    };
    await ctx.reply(`Enter the new value for ${field}${hints[field] ?? ''}:`, Keyboards.cancelOnly());
  }

  private resolveUpdateField(text: string): (typeof UPDATE_FIELDS)[number] | null {
    const asIndex = Number.parseInt(text, 10);
    if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= UPDATE_FIELDS.length) {
      return UPDATE_FIELDS[asIndex - 1];
    }
    const found = UPDATE_FIELDS.find((f) => f.toLowerCase() === text.trim().toLowerCase());
    return found ?? null;
  }

  private async buildUpdate(
    ctx: BotContext,
    field: (typeof UPDATE_FIELDS)[number],
    text: string,
  ): Promise<UpdateItemInput | null> {
    const skipped = SKIP_TOKENS.has(text.toLowerCase());
    switch (field) {
      case 'Name':
        if (!text) {
          await ctx.reply('Name cannot be empty.');
          return null;
        }
        return { name: text };
      case 'Quantity': {
        const qty = Number.parseInt(text, 10);
        if (!Number.isInteger(qty) || qty < 0) {
          await ctx.reply('Quantity must be a whole number of 0 or more.');
          return null;
        }
        return { quantity: qty };
      }
      case 'Minimum Stock': {
        if (skipped) return { minimumStock: null };
        const min = Number.parseInt(text, 10);
        if (!Number.isInteger(min) || min < 0) {
          await ctx.reply('Minimum stock must be a whole number of 0 or more.');
          return null;
        }
        return { minimumStock: min };
      }
      case 'Unit':
        return { unit: skipped ? null : text };
      case 'Location': {
        if (skipped) return { locationId: null };
        const location = await this.locations.findByName(text);
        if (!location) {
          await ctx.reply('Location not found. Try again, or "-" to clear.');
          return null;
        }
        return { locationId: location.id };
      }
      case 'Storage Detail':
        return { storageDetail: skipped ? null : text };
      case 'Condition': {
        const cond = matchEnum<ItemCondition>(text, CONDITION_LABELS);
        if (!cond) {
          await ctx.reply('Unknown condition. Try: New, Good, Fair, Needs Repair, Broken, Lost, Unknown.');
          return null;
        }
        return { condition: cond };
      }
      case 'Availability': {
        const avail = matchEnum<AvailabilityStatus>(text, AVAILABILITY_LABELS);
        if (!avail) {
          await ctx.reply('Unknown availability. Try: Available, In Use, Borrowed, Maintenance, Missing, Retired, Disposed.');
          return null;
        }
        return { availabilityStatus: avail };
      }
      case 'Owner / Source': {
        const owner = matchEnum<OwnerSource>(text, OWNER_SOURCE_LABELS);
        if (!owner) {
          await ctx.reply('Unknown owner/source. Try: Lab Purchase, University Asset, Donation, Personal Loan, Unknown.');
          return null;
        }
        return { ownerSource: owner };
      }
      case 'Notes':
        return { notes: skipped ? null : text };
    }
  }

  // ---- ARCHIVE -------------------------------------------------------------

  private async archiveText(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    text: string,
  ): Promise<void> {
    const data = state.data;

    if (state.step === 0) {
      const item = await this.inventory.getByCode(text);
      if (!item) {
        this.conversations.clear(userId);
        await ctx.reply(`Item "${text}" was not found.`);
        return;
      }
      data.code = item.code;
      data.name = item.name;
      state.step = 1;
      this.conversations.set(userId, state);
      await ctx.reply(
        `Archive "${item.name}" (${item.code})?`,
        Keyboards.confirmArchive(),
      );
      return;
    }

    if (state.step === 1) {
      if (text.toUpperCase() === 'YES') {
        return this.doArchive(ctx, userId, data.code as string);
      }
      this.conversations.clear(userId);
      await ctx.reply('Cancelled. The item was not archived.');
    }
  }

  private async archiveCallback(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    action: string,
  ): Promise<void> {
    if (action === 'yes' && state.step === 1) {
      await this.clearMarkup(ctx);
      return this.doArchive(ctx, userId, state.data.code as string);
    }
  }

  private async doArchive(ctx: BotContext, userId: string, code: string): Promise<void> {
    const item = await this.inventory.archiveItem(code);
    this.conversations.clear(userId);
    await ctx.reply(`✅ Archived "${item.name}" (${item.code}).`);
  }

  // ---- shared helpers ------------------------------------------------------

  private async cancel(ctx: BotContext, userId: string): Promise<void> {
    this.conversations.clear(userId);
    await ctx.reply('Cancelled.');
  }

  private async clearMarkup(ctx: BotContext): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {
      // Message may be too old or already edited — safe to ignore.
    }
  }
}
