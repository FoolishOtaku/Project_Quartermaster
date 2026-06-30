import { Category, Location } from '@prisma/client';
import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import {
  AVAILABILITY_LABELS,
  CONDITION_LABELS,
  OWNER_SOURCE_LABELS,
} from '../../inventory/inventory.presenter';

/**
 * Callback-data scheme: `qm|<flow>|<action>|<value>`.
 * Flow tags: a = add item, n = add unit, u = update item, m = update unit,
 * x = archive item, r = archive unit. `qm|cancel` cancels any flow.
 */
export const CB = {
  NS: 'qm',
  CANCEL: 'qm|cancel',
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
const skipCancelRow = (flow: string): Btn[] => [
  Markup.button.callback('⏭ Skip', `qm|${flow}|skip`),
  Markup.button.callback('❌ Cancel', CB.CANCEL),
];

export const Keyboards = {
  cancelOnly: () => Markup.inlineKeyboard([cancelRow()]),

  skipCancel: (flow = 'a') => Markup.inlineKeyboard([skipCancelRow(flow)]),

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
      [Markup.button.callback('🖥 Individual Asset', 'qm|a|trk|INDIVIDUAL_ASSET')],
      cancelRow(),
    ]),

  locations: (locations: Location[], flow = 'a') => {
    const buttons = locations.map((l) =>
      Markup.button.callback(l.name, `qm|${flow}|loc|${l.id}`),
    );
    return Markup.inlineKeyboard([
      ...chunk(buttons, 2),
      [Markup.button.callback('⏭ Skip (Unknown)', `qm|${flow}|skip`)],
      cancelRow(),
    ]);
  },

  condition: (flow = 'a') => {
    const keys: (keyof typeof CONDITION_LABELS)[] = [
      'NEW',
      'GOOD',
      'FAIR',
      'NEEDS_REPAIR',
      'BROKEN',
      'LOST',
      'UNKNOWN',
    ];
    const buttons = keys.map((k) =>
      Markup.button.callback(CONDITION_LABELS[k], `qm|${flow}|con|${k}`),
    );
    return Markup.inlineKeyboard([...chunk(buttons, 2), cancelRow()]);
  },

  availability: (flow = 'm') => {
    const keys: (keyof typeof AVAILABILITY_LABELS)[] = [
      'AVAILABLE',
      'IN_USE',
      'BORROWED',
      'MAINTENANCE',
      'MISSING',
      'RETIRED',
      'DISPOSED',
    ];
    const buttons = keys.map((k) =>
      Markup.button.callback(AVAILABILITY_LABELS[k], `qm|${flow}|avl|${k}`),
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

  updateFields: (fields: readonly string[]) => {
    const buttons = fields.map((f, i) => Markup.button.callback(f, `qm|u|fld|${i}`));
    return Markup.inlineKeyboard([...chunk(buttons, 2), cancelRow()]);
  },

  updateUnitFields: (fields: readonly string[]) => {
    const buttons = fields.map((f, i) => Markup.button.callback(f, `qm|m|fld|${i}`));
    return Markup.inlineKeyboard([...chunk(buttons, 2), cancelRow()]);
  },

  confirmArchive: () =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Yes, archive', 'qm|x|yes'),
        Markup.button.callback('❌ Cancel', CB.CANCEL),
      ],
    ]),

  confirmArchiveUnit: () =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Yes, archive', 'qm|r|yes'),
        Markup.button.callback('❌ Cancel', CB.CANCEL),
      ],
    ]),

  // ---- Borrowing (flow 'b') / Returning (flow 't') -----------------------

  borrowUnits: (units: { unitCode: string }[]) => {
    const buttons = units.map((u) => Markup.button.callback(u.unitCode, `qm|b|unit|${u.unitCode}`));
    return Markup.inlineKeyboard([...chunk(buttons, 1), cancelRow()]);
  },

  confirmBorrow: () =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Confirm', 'qm|b|cfm|yes'),
        Markup.button.callback('❌ Cancel', CB.CANCEL),
      ],
    ]),

  returnRecords: (records: { id: string; label: string }[]) => {
    const buttons = records.map((r) => Markup.button.callback(r.label, `qm|t|rec|${r.id}`));
    return Markup.inlineKeyboard([...chunk(buttons, 1), cancelRow()]);
  },

  returnCondition: () => {
    const opts: [string, string][] = [
      ['Good', 'GOOD'],
      ['Same as borrowed', 'SAME_AS_BORROWED'],
      ['Damaged', 'DAMAGED'],
      ['Needs Repair', 'NEEDS_REPAIR'],
      ['Missing', 'MISSING'],
    ];
    const buttons = opts.map(([label, key]) => Markup.button.callback(label, `qm|t|cond|${key}`));
    return Markup.inlineKeyboard([...chunk(buttons, 2), cancelRow()]);
  },
};
