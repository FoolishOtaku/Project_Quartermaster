import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { BotContext } from '../bot.context';
import { ROLE_LABELS } from '../../common/constants/roles';
import { UsersService } from '../../users/users.service';
import { RegistrationKeyboards } from './registration.keyboard';
import { RegistrationRequest, RegistrationStore } from './registration.store';

function isUserRole(value: string): value is UserRole {
  return (Object.values(UserRole) as string[]).includes(value);
}

/**
 * Main-admin-only review panel: approve registration requests (assigning a
 * role) and manage existing users' roles. "Main admin" is the single creator
 * account identified by ADMIN_TELEGRAM_ID — not just anyone with the ADMIN
 * role — so only that account can accept requests and change roles.
 */
@Injectable()
export class RegistrationAdminService {
  private readonly logger = new Logger(RegistrationAdminService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly store: RegistrationStore,
  ) {}

  // ---- Main-admin identity -------------------------------------------------

  mainAdminId(): string | null {
    return this.config.get<string>('ADMIN_TELEGRAM_ID')?.trim() || null;
  }

  isMainAdmin(telegramId?: string | null): boolean {
    const id = this.mainAdminId();
    return !!id && !!telegramId && telegramId === id;
  }

  /** Notify the main admin that a new request arrived (called by the flow). */
  async notifyNewRequest(ctx: BotContext, request: RegistrationRequest): Promise<void> {
    const adminId = this.mainAdminId();
    if (!adminId) return;
    const text = [
      '📨 New registration request',
      '',
      `Name: ${request.fullName}`,
      `NIM: ${request.nim}`,
      request.telegramUsername ? `Username: @${request.telegramUsername}` : null,
      `Telegram ID: ${request.telegramId}`,
      '',
      'Open the 🛡 Admin panel or send /requests to review it (expires in 2 minutes).',
    ]
      .filter((l): l is string => l !== null)
      .join('\n');
    try {
      await ctx.telegram.sendMessage(adminId, text);
    } catch (error) {
      this.logger.warn(`Could not notify main admin: ${(error as Error).message}`);
    }
  }

  // ---- Entry point (command /requests + menu button) ----------------------

  async openPanel(ctx: BotContext, telegramId: string): Promise<void> {
    if (!this.isMainAdmin(telegramId)) {
      await ctx.reply('Only the main admin can manage registrations and roles.');
      return;
    }
    await this.renderHome(ctx, false);
  }

  // ---- Callback router (qm|adm|*) -----------------------------------------

  async handleCallback(ctx: BotContext, telegramId: string, data: string): Promise<void> {
    await ctx.answerCbQuery();
    if (!this.isMainAdmin(telegramId)) {
      await ctx.reply('Only the main admin can manage registrations and roles.');
      return;
    }

    const parts = data.split('|'); // qm | adm | action | [targetId] | [ROLE]
    const action = parts[2] ?? '';
    const targetId = parts[3] ?? '';
    const role = parts[4] ?? '';

    try {
      switch (action) {
        case 'home':
          return await this.renderHome(ctx, true);
        case 'reqs':
          return await this.renderRequests(ctx);
        case 'req':
          return await this.renderRequestDetail(ctx, targetId);
        case 'setnew':
          return await this.approve(ctx, targetId, role);
        case 'users':
          return await this.renderUsers(ctx);
        case 'user':
          return await this.renderUserDetail(ctx, targetId);
        case 'setrole':
          return await this.setRole(ctx, targetId, role);
        case 'deact':
          return await this.deactivate(ctx, targetId);
        default:
          return;
      }
    } catch (error) {
      this.logger.error(`Admin action "${action}" failed`, error as Error);
      await ctx.reply('Something went wrong handling that admin action.');
    }
  }

  // ---- Renderers -----------------------------------------------------------

  private async renderHome(ctx: BotContext, edit: boolean): Promise<void> {
    const count = this.store.list().length;
    const text = '🛡 *Admin panel*\n\nReview registration requests and manage user roles.';
    const keyboard = RegistrationKeyboards.adminHome(count);
    if (edit) {
      try {
        await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
        return;
      } catch {
        /* fall through to reply */
      }
    }
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }

  private async renderRequests(ctx: BotContext): Promise<void> {
    const requests = this.store.list();
    if (requests.length === 0) {
      await this.editOrReply(ctx, 'No pending registration requests right now.', RegistrationKeyboards.adminHome(0));
      return;
    }
    const lines = requests.map(
      (r, i) => `${i + 1}. ${r.fullName} (${r.nim}) — ${this.minutesLeft(r)}`,
    );
    const text = ['📨 Pending requests:', '', ...lines, '', 'Tap a request to assign a role.'].join('\n');
    await this.editOrReply(ctx, text, RegistrationKeyboards.requestList(requests));
  }

  private async renderRequestDetail(ctx: BotContext, telegramId: string): Promise<void> {
    const request = this.store.get(telegramId);
    if (!request) {
      await this.editOrReply(
        ctx,
        'That request has expired or was already handled.',
        RegistrationKeyboards.requestList(this.store.list()),
      );
      return;
    }
    const text = [
      'Registration request',
      '',
      `Name: ${request.fullName}`,
      `NIM: ${request.nim}`,
      request.telegramUsername ? `Username: @${request.telegramUsername}` : 'Username: —',
      `Telegram ID: ${request.telegramId}`,
      `Expires in: ${this.minutesLeft(request)}`,
      '',
      'Choose a role to approve this user:',
    ].join('\n');
    await this.editOrReply(ctx, text, RegistrationKeyboards.approveRoles(telegramId));
  }

  private async approve(ctx: BotContext, telegramId: string, roleRaw: string): Promise<void> {
    if (!isUserRole(roleRaw)) return;
    const request = this.store.get(telegramId);
    if (!request) {
      await this.editOrReply(
        ctx,
        'That request has expired or was already handled. Ask the user to register again.',
        RegistrationKeyboards.requestList(this.store.list()),
      );
      return;
    }

    const existing = await this.users.findByTelegramId(telegramId);
    if (existing) {
      await this.users.updateByTelegramId(telegramId, {
        role: roleRaw,
        isActive: true,
        fullName: request.fullName,
        nim: request.nim,
        telegramUsername: request.telegramUsername,
      });
    } else {
      await this.users.create({
        telegramId,
        fullName: request.fullName,
        nim: request.nim,
        telegramUsername: request.telegramUsername,
        role: roleRaw,
      });
    }
    this.store.remove(telegramId);

    await this.notifyUser(
      ctx,
      telegramId,
      `✅ You're registered as ${ROLE_LABELS[roleRaw]}! Send /menu to get started.`,
    );

    await this.editOrReply(
      ctx,
      `✅ Approved ${request.fullName} as ${ROLE_LABELS[roleRaw]}.`,
      RegistrationKeyboards.requestList(this.store.list()),
    );
  }

  private async renderUsers(ctx: BotContext): Promise<void> {
    const users = await this.users.list(25);
    if (users.length === 0) {
      await this.editOrReply(ctx, 'No users yet.', RegistrationKeyboards.adminHome(this.store.list().length));
      return;
    }
    const text = '👥 Users — tap one to change their role or deactivate them.';
    await this.editOrReply(ctx, text, RegistrationKeyboards.userList(users));
  }

  private async renderUserDetail(ctx: BotContext, telegramId: string): Promise<void> {
    const user = await this.users.findByTelegramId(telegramId);
    if (!user) {
      await this.editOrReply(ctx, 'That user no longer exists.', RegistrationKeyboards.userList(await this.users.list(25)));
      return;
    }
    const text = [
      'Manage user',
      '',
      `Name: ${user.fullName}`,
      user.nim ? `NIM: ${user.nim}` : 'NIM: —',
      user.telegramUsername ? `Username: @${user.telegramUsername}` : 'Username: —',
      `Telegram ID: ${user.telegramId}`,
      `Current role: ${ROLE_LABELS[user.role]}`,
      `Status: ${user.isActive ? 'Active' : 'Inactive'}`,
      '',
      this.isMainAdmin(telegramId)
        ? 'This is the main admin account and cannot be changed.'
        : 'Choose a new role, or deactivate the user:',
    ].join('\n');
    const canModify = !this.isMainAdmin(telegramId);
    await this.editOrReply(ctx, text, RegistrationKeyboards.manageUser(telegramId, canModify));
  }

  private async setRole(ctx: BotContext, telegramId: string, roleRaw: string): Promise<void> {
    if (!isUserRole(roleRaw)) return;
    if (this.isMainAdmin(telegramId)) {
      await ctx.reply('The main admin account cannot be changed.');
      return;
    }
    const user = await this.users.setRoleByTelegramId(telegramId, roleRaw);
    if (!user) {
      await ctx.reply('That user no longer exists.');
      return;
    }
    await this.notifyUser(ctx, telegramId, `ℹ️ Your role was updated to ${ROLE_LABELS[roleRaw]}.`);
    await this.renderUserDetail(ctx, telegramId);
  }

  private async deactivate(ctx: BotContext, telegramId: string): Promise<void> {
    if (this.isMainAdmin(telegramId)) {
      await ctx.reply('The main admin account cannot be deactivated.');
      return;
    }
    const user = await this.users.setActiveByTelegramId(telegramId, false);
    if (!user) {
      await ctx.reply('That user no longer exists.');
      return;
    }
    await this.notifyUser(ctx, telegramId, '🚫 Your access has been deactivated by the admin.');
    await this.renderUserDetail(ctx, telegramId);
  }

  // ---- helpers -------------------------------------------------------------

  private async notifyUser(ctx: BotContext, telegramId: string, text: string): Promise<void> {
    try {
      await ctx.telegram.sendMessage(telegramId, text);
    } catch (error) {
      this.logger.warn(`Could not notify user ${telegramId}: ${(error as Error).message}`);
    }
  }

  private minutesLeft(request: RegistrationRequest): string {
    const ms = Math.max(0, request.expiresAt.getTime() - Date.now());
    const seconds = Math.ceil(ms / 1000);
    return seconds > 60 ? `${Math.ceil(seconds / 60)} min left` : `${seconds}s left`;
  }

  private async editOrReply(
    ctx: BotContext,
    text: string,
    keyboard: ReturnType<typeof RegistrationKeyboards.adminHome>,
  ): Promise<void> {
    try {
      await ctx.editMessageText(text, keyboard);
    } catch {
      await ctx.reply(text, keyboard);
    }
  }
}
