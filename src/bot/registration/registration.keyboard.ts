import { User, UserRole } from '@prisma/client';
import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import { ROLE_LABELS } from '../../common/constants/roles';
import { RegistrationRequest } from './registration.store';

/**
 * Keyboards for the registration flow (`qm|reg|*`, applicant side) and the
 * main-admin review panel (`qm|adm|*`).
 *
 * Admin actions key off the target user's Telegram id (short, numeric) rather
 * than the uuid, to stay well under Telegram's 64-byte callback-data limit.
 */
type Btn = InlineKeyboardButton;

const cb = (label: string, data: string): Btn => Markup.button.callback(label, data);

/** Roles offered when approving/assigning, in descending privilege order. */
const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.ASSISTANT,
  UserRole.TRUSTED_MEMBER,
  UserRole.VIEWER,
];

function chunk(buttons: Btn[], perRow: number): Btn[][] {
  const rows: Btn[][] = [];
  for (let i = 0; i < buttons.length; i += perRow) {
    rows.push(buttons.slice(i, i + perRow));
  }
  return rows;
}

export const RegistrationKeyboards = {
  // ---- Applicant side ----------------------------------------------------

  /** Shown on /start for an unregistered user. */
  startButton: () => Markup.inlineKeyboard([[cb('📝 Register', 'qm|reg|start')]]),

  cancel: () => Markup.inlineKeyboard([[cb('❌ Cancel', 'qm|reg|cancel')]]),

  confirm: () =>
    Markup.inlineKeyboard([
      [cb('✅ Submit request', 'qm|reg|submit')],
      [cb('❌ Cancel', 'qm|reg|cancel')],
    ]),

  // ---- Admin side --------------------------------------------------------

  adminHome: (pendingCount: number) =>
    Markup.inlineKeyboard([
      [cb(`📨 Registration requests (${pendingCount})`, 'qm|adm|reqs')],
      [cb('👥 Manage users', 'qm|adm|users')],
      [cb('⬅️ Back to menu', 'qm|menu|home')],
    ]),

  requestList: (requests: RegistrationRequest[]) => {
    const rows = requests.map((r) => [
      cb(`${r.fullName} (${r.nim})`, `qm|adm|req|${r.telegramId}`),
    ]);
    rows.push([cb('🔄 Refresh', 'qm|adm|reqs'), cb('⬅️ Back', 'qm|adm|home')]);
    return Markup.inlineKeyboard(rows);
  },

  /** Role buttons for approving a pending request. */
  approveRoles: (telegramId: string) => {
    const buttons = ASSIGNABLE_ROLES.map((role) =>
      cb(ROLE_LABELS[role], `qm|adm|setnew|${telegramId}|${role}`),
    );
    return Markup.inlineKeyboard([
      ...chunk(buttons, 2),
      [cb('⬅️ Back to requests', 'qm|adm|reqs')],
    ]);
  },

  userList: (users: User[]) => {
    const rows = users.map((u) => [
      cb(
        `${u.isActive ? '' : '🚫 '}${u.fullName} — ${ROLE_LABELS[u.role]}`,
        `qm|adm|user|${u.telegramId}`,
      ),
    ]);
    rows.push([cb('⬅️ Back', 'qm|adm|home')]);
    return Markup.inlineKeyboard(rows);
  },

  /** Role buttons + deactivate for an existing user. */
  manageUser: (telegramId: string, canDeactivate: boolean) => {
    const buttons = ASSIGNABLE_ROLES.map((role) =>
      cb(ROLE_LABELS[role], `qm|adm|setrole|${telegramId}|${role}`),
    );
    const rows = [...chunk(buttons, 2)];
    if (canDeactivate) {
      rows.push([cb('🚫 Deactivate user', `qm|adm|deact|${telegramId}`)]);
    }
    rows.push([cb('⬅️ Back to users', 'qm|adm|users')]);
    return Markup.inlineKeyboard(rows);
  },
};
