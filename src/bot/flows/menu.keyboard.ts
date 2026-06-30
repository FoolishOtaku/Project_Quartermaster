import { UserRole } from '@prisma/client';
import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import { REPORT_KINDS, REPORT_META, ReportKind } from '../../reports/reports.types';

/**
 * Interactive menu keyboards. These sit on top of the existing slash commands:
 * every button just triggers the same action the matching command would.
 *
 * Callback-data scheme: `qm|menu|<action>`. The central callback router in
 * inventory.update.ts intercepts anything starting with `qm|menu` and forwards
 * it to MenuService, so it never collides with the per-flow callbacks
 * (`qm|a|...`, `qm|b|...`, etc.).
 */
export const MENU = {
  // Navigation
  HOME: 'qm|menu|home',
  MANAGE: 'qm|menu|manage',
  CLOSE: 'qm|menu|close',
  // Everyone (registered)
  SEARCH: 'qm|menu|search',
  VIEW_ITEM: 'qm|menu|view_item',
  VIEW_UNIT: 'qm|menu|view_unit',
  WHO_HAS: 'qm|menu|whohas',
  MY_BORROWED: 'qm|menu|myborrowed',
  PROFILE: 'qm|menu|profile',
  HELP: 'qm|menu|help',
  REPORTS: 'qm|menu|reports',
  // Borrowing roles
  BORROW: 'qm|menu|borrow',
  RETURN: 'qm|menu|return',
  // Manage (admin / assistant; archive admin-only)
  ADD_ITEM: 'qm|menu|add_item',
  UPDATE_ITEM: 'qm|menu|update_item',
  ARCHIVE_ITEM: 'qm|menu|archive_item',
  ADD_UNIT: 'qm|menu|add_unit',
  UPDATE_UNIT: 'qm|menu|update_unit',
  ARCHIVE_UNIT: 'qm|menu|archive_unit',
} as const;

type Btn = InlineKeyboardButton;

const CAN_BORROW: UserRole[] = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.ASSISTANT,
  UserRole.TRUSTED_MEMBER,
];
const CAN_MANAGE: UserRole[] = [UserRole.ADMIN, UserRole.ASSISTANT];
const CAN_ARCHIVE: UserRole[] = [UserRole.ADMIN];
const CAN_REPORT: UserRole[] = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.ASSISTANT];

export const canBorrow = (role: UserRole): boolean => CAN_BORROW.includes(role);
export const canManage = (role: UserRole): boolean => CAN_MANAGE.includes(role);
export const canArchive = (role: UserRole): boolean => CAN_ARCHIVE.includes(role);
export const canReport = (role: UserRole): boolean => CAN_REPORT.includes(role);

const cb = (label: string, data: string): Btn => Markup.button.callback(label, data);

export const MenuKeyboards = {
  /** Main menu — tailored to what this user's role is allowed to do. */
  main: (role: UserRole) => {
    const rows: Btn[][] = [
      [cb('🔍 Search', MENU.SEARCH), cb('📄 View item', MENU.VIEW_ITEM)],
      [cb('🔧 View unit', MENU.VIEW_UNIT), cb('👥 Who has it', MENU.WHO_HAS)],
    ];

    if (canBorrow(role)) {
      rows.push([cb('📤 Borrow', MENU.BORROW), cb('📥 Return', MENU.RETURN)]);
    }

    rows.push([cb('📋 My borrowed', MENU.MY_BORROWED), cb('👤 My profile', MENU.PROFILE)]);

    if (canReport(role)) {
      rows.push([cb('📊 Reports', MENU.REPORTS)]);
    }

    if (canManage(role)) {
      rows.push([cb('🛠 Manage inventory', MENU.MANAGE)]);
    }

    rows.push([cb('❓ Help', MENU.HELP)]);

    return Markup.inlineKeyboard(rows);
  },

  /** Manage submenu — admin / assistant only (archive shown to admin only). */
  manage: (role: UserRole) => {
    const rows: Btn[][] = [
      [cb('➕ Add item', MENU.ADD_ITEM), cb('✏️ Update item', MENU.UPDATE_ITEM)],
      [cb('➕ Add unit', MENU.ADD_UNIT), cb('✏️ Update unit', MENU.UPDATE_UNIT)],
    ];

    if (canArchive(role)) {
      rows.push([cb('🗄 Archive item', MENU.ARCHIVE_ITEM), cb('🗄 Archive unit', MENU.ARCHIVE_UNIT)]);
    }

    rows.push([cb('⬅️ Back', MENU.HOME)]);

    return Markup.inlineKeyboard(rows);
  },

  /** A single "Open menu" button to attach to /start and /help. */
  openButton: () => Markup.inlineKeyboard([[cb('📋 Open menu', MENU.HOME)]]),
};

/** Keyboards for the Reports area. Report taps route via `qm|menu|rpt|<kind>`. */
export const ReportKeyboards = {
  /** List of report buttons (used by the Reports submenu and `/report`). */
  list: () => {
    const buttons = REPORT_KINDS.map((k: ReportKind) =>
      cb(REPORT_META[k].label, `qm|menu|rpt|${k}`),
    );
    const rows: Btn[][] = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }
    rows.push([cb('⬅️ Back', MENU.HOME)]);
    return Markup.inlineKeyboard(rows);
  },

  /** Buttons shown under a generated report: download CSV + back to reports. */
  afterReport: (kind: ReportKind) =>
    Markup.inlineKeyboard([
      [cb('⬇️ Download CSV', `qm|menu|rcsv|${kind}`)],
      [cb('⬅️ Reports', MENU.REPORTS)],
    ]),
};
