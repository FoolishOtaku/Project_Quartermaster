import { Category, Location } from '@prisma/client';
import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import {
  CONDITION_LABELS,
  OWNER_SOURCE_LABELS,
} from '../../inventory/inventory.presenter';

/**
 * Callback-data scheme: `qm|<flow>|<action>|<value>`.
 * Flow tags: a = add, u = update, x = archive. `qm|cancel` cancels any flow.
 * Values that are enum keys or UUIDs stay well under Telegram's 64-byte limit.
 */
export const CB = {
  NS: 'qm',
  CANCEL: 'qm|cancel',
  SKIP_ADD: 'qm|a|skip',
};

type Btn = InlineKeyboardButton;

function chunk<T>(items: T[], perRow: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow));
  }
  return rows;
}

const cancelRow = (): Btn[] => [Markup.button.callback('❌ Cancel', CB.CANCEL)];
const skipCancelRow = (): Btn[] => [
  Markup.button.callback('⏭ Skip', CB.SKIP_ADD),
  Markup.button.callback('❌ Cancel', CB.CANCEL),
];

export const Keyboards = {
  cancelOnly: () => Markup.inlineKeyboard([cancelRow()]),

  skipCancel: () => Markup.inlineKeyboard([skipCancelRow()]),

  categories: (categories: Category[]) => {
    const buttons = categories.map((c) =>
      Markup.button.callback(c.name, `qm|a|cat|${c.id}`),
    );
    return Markup.inlineKeyboard([...chunk(buttons, 2), cancelRow()]);
  },

  tracking: () =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback('📦 Bulk Stock', 'qm|a|trk|BULK_STOCK'),
        Markup.button.callback('🧴 Consumable', 'qm|a|trk|CONSUMABLE'),
      ],
      cancelRow(),
    ]),

  locations: (locations: Location[]) => {
    const buttons = locations.map((l) =>
      Markup.button.callback(l.name, `qm|a|loc|${l.id}`),
    );
    return Markup.inlineKeyboard([
      ...chunk(buttons, 2),
      [Markup.button.callback('⏭ Skip (Unknown)', CB.SKIP_ADD)],
      cancelRow(),
    ]);
  },

  // Conditions sensible for a newly added item.
  condition: () => {
    const keys: (keyof typeof CONDITION_LABELS)[] = [
      'NEW',
      'GOOD',
      'FAIR',
      'NEEDS_REPAIR',
      'BROKEN',
    ];
    const buttons = keys.map((k) =>
      Markup.button.callback(CONDITION_LABELS[k], `qm|a|con|${k}`),
    );
    return Markup.inlineKeyboard([...chunk(buttons, 2), cancelRow()]);
  },

  ownerSource: () => {
    const keys: (keyof typeof OWNER_SOURCE_LABELS)[] = [
      'LAB_PURCHASE',
      'UNIVERSITY_ASSET',
      'DONATION',
      'PERSONAL_LOAN',
      'UNKNOWN',
    ];
    const buttons = keys.map((k) =>
      Markup.button.callback(OWNER_SOURCE_LABELS[k], `qm|a|own|${k}`),
    );
    return Markup.inlineKeyboard([...chunk(buttons, 2), cancelRow()]);
  },

  confirmAdd: () =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Confirm', 'qm|a|cfm|yes'),
        Markup.button.callback('❌ Cancel', CB.CANCEL),
      ],
    ]),

  // Update: field picker.
  updateFields: (fields: readonly string[]) => {
    const buttons = fields.map((f, i) =>
      Markup.button.callback(f, `qm|u|fld|${i}`),
    );
    return Markup.inlineKeyboard([...chunk(buttons, 2), cancelRow()]);
  },

  // Archive: confirm.
  confirmArchive: () =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Yes, archive', 'qm|x|yes'),
        Markup.button.callback('❌ Cancel', CB.CANCEL),
      ],
    ]),
};
