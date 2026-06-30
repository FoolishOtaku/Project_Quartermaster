import { Injectable, Logger } from '@nestjs/common';
import {
  AvailabilityStatus,
  ItemCondition,
  OwnerSource,
  TrackingType,
} from '@prisma/client';
import { BotContext } from '../bot.context';
import { ConversationService, ConversationState } from '../conversation/conversation.service';
import { InventoryService } from '../../inventory/inventory.service';
import { CategoriesService } from '../../categories/categories.service';
import { LocationsService } from '../../locations/locations.service';
import {
  AVAILABILITY_LABELS,
  CONDITION_LABELS,
  OWNER_SOURCE_LABELS,
  formatItemDetail,
} from '../../inventory/inventory.presenter';
import { UpdateItemInput } from '../../inventory/inventory.types';

const SKIP_TOKENS = new Set(['-', 'skip', 'none', '']);

/** Invert a label map to resolve user text back to an enum key. */
function matchEnum<T extends string>(
  text: string,
  labels: Record<T, string>,
): T | null {
  const normalized = text.trim().toLowerCase();
  for (const key of Object.keys(labels) as T[]) {
    if (
      key.toLowerCase() === normalized ||
      labels[key].toLowerCase() === normalized
    ) {
      return key;
    }
  }
  return null;
}

const UPDATE_FIELDS = [
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

@Injectable()
export class InventoryFlowService {
  private readonly logger = new Logger(InventoryFlowService.name);

  constructor(
    private readonly conversations: ConversationService,
    private readonly inventory: InventoryService,
    private readonly categories: CategoriesService,
    private readonly locations: LocationsService,
  ) {}

  // ---- Flow entry points ---------------------------------------------------

  async startAddItem(ctx: BotContext, userId: string, pic: string): Promise<void> {
    this.conversations.start(userId, 'ADD_ITEM', { pic });
    await ctx.reply('Add a new item.\n\nStep 1 — Item name?');
  }

  async startUpdateItem(
    ctx: BotContext,
    userId: string,
    codeArg: string,
  ): Promise<void> {
    this.conversations.start(userId, 'UPDATE_ITEM', {});
    if (codeArg) {
      await this.route(ctx, userId, codeArg);
    } else {
      await ctx.reply('Update an item.\n\nEnter the item code (e.g. ASE-CAB-001):');
    }
  }

  async startArchiveItem(
    ctx: BotContext,
    userId: string,
    codeArg: string,
  ): Promise<void> {
    this.conversations.start(userId, 'ARCHIVE_ITEM', {});
    if (codeArg) {
      await this.route(ctx, userId, codeArg);
    } else {
      await ctx.reply('Archive an item.\n\nEnter the item code to archive:');
    }
  }

  // ---- Router --------------------------------------------------------------

  async route(ctx: BotContext, userId: string, text: string): Promise<void> {
    const state = this.conversations.get(userId);
    if (!state) {
      return;
    }

    const trimmed = text.trim();
    if (trimmed.toLowerCase() === '/cancel' || trimmed.toLowerCase() === 'cancel') {
      this.conversations.clear(userId);
      await ctx.reply('Cancelled.');
      return;
    }

    try {
      switch (state.flow) {
        case 'ADD_ITEM':
          await this.handleAddItem(ctx, userId, state, trimmed);
          break;
        case 'UPDATE_ITEM':
          await this.handleUpdateItem(ctx, userId, state, trimmed);
          break;
        case 'ARCHIVE_ITEM':
          await this.handleArchiveItem(ctx, userId, state, trimmed);
          break;
      }
    } catch (error) {
      this.logger.error(`Flow ${state.flow} failed`, error as Error);
      this.conversations.clear(userId);
      await ctx.reply('Something went wrong. The operation was cancelled.');
    }
  }

  // ---- ADD_ITEM ------------------------------------------------------------

  private async handleAddItem(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    text: string,
  ): Promise<void> {
    const data = state.data;
    const skipped = SKIP_TOKENS.has(text.toLowerCase());

    switch (state.step) {
      case 0: // name
        if (!text) {
          await ctx.reply('Item name cannot be empty. Item name?');
          return;
        }
        data.name = text;
        return this.advance(ctx, userId, state, 'Step 2 — Category? Type the name.\n' + (await this.categoryList()));

      case 1: { // category
        const category = await this.categories.findByName(text);
        if (!category) {
          await ctx.reply('Category not found. Choose one:\n' + (await this.categoryList()));
          return;
        }
        data.categoryId = category.id;
        data.categoryName = category.name;
        return this.advance(
          ctx,
          userId,
          state,
          'Step 3 — Tracking type? (Bulk Stock / Consumable)',
        );
      }

      case 2: { // tracking type
        const tracking = matchEnum<TrackingType>(text, {
          INDIVIDUAL_ASSET: 'Individual Asset',
          BULK_STOCK: 'Bulk Stock',
          CONSUMABLE: 'Consumable',
        });
        if (tracking !== TrackingType.BULK_STOCK && tracking !== TrackingType.CONSUMABLE) {
          await ctx.reply('Please type "Bulk Stock" or "Consumable".');
          return;
        }
        data.trackingType = tracking;
        return this.advance(ctx, userId, state, 'Step 4 — Quantity? (whole number)');
      }

      case 3: { // quantity
        const qty = Number.parseInt(text, 10);
        if (!Number.isInteger(qty) || qty < 0) {
          await ctx.reply('Quantity must be a whole number of 0 or more.');
          return;
        }
        data.quantity = qty;
        return this.advance(ctx, userId, state, 'Step 5 — Unit? (e.g. pcs, set, box) or "-" to skip');
      }

      case 4: // unit
        data.unit = skipped ? null : text;
        return this.advance(ctx, userId, state, 'Step 6 — Minimum stock? (whole number) or "-" to skip');

      case 5: { // minimum stock
        if (skipped) {
          data.minimumStock = null;
        } else {
          const min = Number.parseInt(text, 10);
          if (!Number.isInteger(min) || min < 0) {
            await ctx.reply('Minimum stock must be a whole number of 0 or more, or "-" to skip.');
            return;
          }
          data.minimumStock = min;
        }
        return this.advance(ctx, userId, state, 'Step 7 — Location? Type the name or "-" to skip.\n' + (await this.locationList()));
      }

      case 6: { // location
        if (skipped) {
          data.locationId = null;
        } else {
          const location = await this.locations.findByName(text);
          if (!location) {
            await ctx.reply('Location not found. Choose one or "-" to skip:\n' + (await this.locationList()));
            return;
          }
          data.locationId = location.id;
        }
        return this.advance(ctx, userId, state, 'Step 8 — Storage detail? (e.g. "HDMI section") or "-" to skip');
      }

      case 7: // storage detail
        data.storageDetail = skipped ? null : text;
        return this.advance(
          ctx,
          userId,
          state,
          'Step 9 — Condition? (New / Good / Fair / Needs Repair / Broken) or "-" for Good',
        );

      case 8: { // condition
        if (skipped) {
          data.condition = ItemCondition.GOOD;
        } else {
          const cond = matchEnum<ItemCondition>(text, CONDITION_LABELS);
          if (!cond) {
            await ctx.reply('Unknown condition. Try: New, Good, Fair, Needs Repair, Broken.');
            return;
          }
          data.condition = cond;
        }
        return this.advance(
          ctx,
          userId,
          state,
          'Step 10 — Owner / source? (Lab Purchase / University Asset / Donation / Personal Loan) or "-" for Unknown',
        );
      }

      case 9: { // owner source
        if (skipped) {
          data.ownerSource = OwnerSource.UNKNOWN;
        } else {
          const owner = matchEnum<OwnerSource>(text, OWNER_SOURCE_LABELS);
          if (!owner) {
            await ctx.reply('Unknown owner/source. Try: Lab Purchase, University Asset, Donation, Personal Loan.');
            return;
          }
          data.ownerSource = owner;
        }
        return this.advance(ctx, userId, state, 'Step 11 — Notes? or "-" to skip');
      }

      case 10: // notes
        data.notes = skipped ? null : text;
        state.step = 11;
        this.conversations.set(userId, state);
        await ctx.reply(this.addSummary(data) + '\n\nConfirm? (yes / no)');
        return;

      case 11: { // confirm
        if (text.toLowerCase() === 'yes' || text.toLowerCase() === 'y') {
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
        } else {
          this.conversations.clear(userId);
          await ctx.reply('Cancelled. No item was created.');
        }
        return;
      }
    }
  }

  // ---- UPDATE_ITEM ---------------------------------------------------------

  private async handleUpdateItem(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    text: string,
  ): Promise<void> {
    const data = state.data;

    switch (state.step) {
      case 0: { // item code
        const item = await this.inventory.getByCode(text);
        if (!item) {
          this.conversations.clear(userId);
          await ctx.reply(`Item "${text}" was not found.`);
          return;
        }
        data.code = item.code;
        state.step = 1;
        this.conversations.set(userId, state);
        const menu = UPDATE_FIELDS.map((f, i) => `${i + 1}. ${f}`).join('\n');
        await ctx.reply(
          formatItemDetail(item) + '\n\nWhich field do you want to update?\n' + menu,
        );
        return;
      }

      case 1: { // field choice
        const field = this.resolveUpdateField(text);
        if (!field) {
          await ctx.reply('Please choose a valid field number or name from the list.');
          return;
        }
        data.field = field;
        state.step = 2;
        this.conversations.set(userId, state);
        await ctx.reply(`Enter the new value for ${field}:`);
        return;
      }

      case 2: { // new value
        const field = data.field as (typeof UPDATE_FIELDS)[number];
        const changes = await this.buildUpdate(ctx, field, text);
        if (!changes) {
          return; // validation message already sent; stay on step
        }
        const item = await this.inventory.updateItem(data.code as string, changes);
        this.conversations.clear(userId);
        await ctx.reply('✅ Item updated.\n\n' + formatItemDetail(item));
        return;
      }
    }
  }

  private resolveUpdateField(
    text: string,
  ): (typeof UPDATE_FIELDS)[number] | null {
    const asIndex = Number.parseInt(text, 10);
    if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= UPDATE_FIELDS.length) {
      return UPDATE_FIELDS[asIndex - 1];
    }
    const found = UPDATE_FIELDS.find(
      (f) => f.toLowerCase() === text.trim().toLowerCase(),
    );
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
          await ctx.reply('Location not found. Try again or "-" to clear:\n' + (await this.locationList()));
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

  // ---- ARCHIVE_ITEM --------------------------------------------------------

  private async handleArchiveItem(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    text: string,
  ): Promise<void> {
    const data = state.data;

    switch (state.step) {
      case 0: { // code
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
          `Archive "${item.name}" (${item.code})?\nType YES to confirm, or anything else to cancel.`,
        );
        return;
      }

      case 1: { // confirm
        if (text.toUpperCase() === 'YES') {
          const item = await this.inventory.archiveItem(data.code as string);
          this.conversations.clear(userId);
          await ctx.reply(`✅ Archived "${item.name}" (${item.code}).`);
        } else {
          this.conversations.clear(userId);
          await ctx.reply('Cancelled. The item was not archived.');
        }
        return;
      }
    }
  }

  // ---- helpers -------------------------------------------------------------

  private async advance(
    ctx: BotContext,
    userId: string,
    state: ConversationState,
    nextPrompt: string,
  ): Promise<void> {
    state.step += 1;
    this.conversations.set(userId, state);
    await ctx.reply(nextPrompt);
  }

  private async categoryList(): Promise<string> {
    const names = await this.categories.listNames();
    return 'Categories: ' + names.join(', ');
  }

  private async locationList(): Promise<string> {
    const names = await this.locations.listNames();
    return 'Locations: ' + names.join(', ');
  }

  private addSummary(data: Record<string, unknown>): string {
    return [
      'Please confirm the new item:',
      '',
      `Name: ${data.name as string}`,
      `Category: ${data.categoryName as string}`,
      `Tracking: ${data.trackingType as string}`,
      `Quantity: ${data.quantity as number}${data.unit ? ` ${data.unit as string}` : ''}`,
      data.minimumStock != null ? `Minimum Stock: ${data.minimumStock as number}` : null,
      data.locationId ? null : 'Location: Unknown',
      data.storageDetail ? `Storage Detail: ${data.storageDetail as string}` : null,
      `Condition: ${data.condition as string}`,
      `Owner / Source: ${data.ownerSource as string}`,
      data.notes ? `Notes: ${data.notes as string}` : null,
    ]
      .filter((l): l is string => l !== null)
      .join('\n');
  }
}
