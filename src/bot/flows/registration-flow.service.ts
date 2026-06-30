import { Injectable, Logger } from '@nestjs/common';
import { BotContext } from '../bot.context';
import { ConversationService, ConversationState } from '../conversation/conversation.service';
import { UsersService } from '../../users/users.service';
import { MenuKeyboards } from './menu.keyboard';
import { RegistrationKeyboards } from '../registration/registration.keyboard';
import { RegistrationStore } from '../registration/registration.store';
import { RegistrationAdminService } from '../registration/registration-admin.service';

const STEP = { NAME: 0, NIM: 1, CONFIRM: 2 };

/**
 * Applicant side of registration. An unregistered user is walked through
 * full name → NIM → confirm, which creates a pending request (2-minute TTL)
 * for the main admin to approve. Works for unregistered users because the
 * central text router dispatches by conversation state, not by guard.
 */
@Injectable()
export class RegistrationFlowService {
  private readonly logger = new Logger(RegistrationFlowService.name);

  constructor(
    private readonly conversations: ConversationService,
    private readonly users: UsersService,
    private readonly store: RegistrationStore,
    private readonly admin: RegistrationAdminService,
  ) {}

  /**
   * Entry point for /start, /register, and the 📝 Register button: decide
   * whether to greet, report a pending request, or start the questionnaire.
   */
  async begin(ctx: BotContext, telegramId: string): Promise<void> {
    const user = await this.users.findByTelegramId(telegramId);
    if (user && user.isActive) {
      await ctx.reply("You're already registered. Send /menu to get started.", MenuKeyboards.openButton());
      return;
    }
    if (user && !user.isActive) {
      await ctx.reply('Your account is inactive. Please contact the lab admin.');
      return;
    }
    if (this.store.has(telegramId)) {
      const seconds = Math.ceil(this.store.msRemaining(telegramId) / 1000);
      await ctx.reply(
        `You already have a pending registration request (about ${seconds}s left). ` +
          'Please wait for the admin to review it.',
      );
      return;
    }
    this.conversations.start(telegramId, 'REGISTER', {});
    await ctx.reply(
      '📝 Let\'s get you registered.\n\nWhat is your full name?',
      RegistrationKeyboards.cancel(),
    );
  }

  // ---- Text steps ----------------------------------------------------------

  async handleText(ctx: BotContext, telegramId: string, rawText: string): Promise<void> {
    const state = this.conversations.get(telegramId);
    if (!state) return;
    const text = rawText.trim();
    if (text.toLowerCase() === 'cancel' || text.toLowerCase() === '/cancel') {
      this.conversations.clear(telegramId);
      await ctx.reply('Registration cancelled. Send /register to try again.');
      return;
    }

    try {
      switch (state.step) {
        case STEP.NAME:
          if (!text) {
            await ctx.reply('Your name cannot be empty. What is your full name?', RegistrationKeyboards.cancel());
            return;
          }
          state.data.fullName = text;
          state.step = STEP.NIM;
          this.conversations.set(telegramId, state);
          await ctx.reply('Thanks! What is your NIM (student ID)?', RegistrationKeyboards.cancel());
          return;

        case STEP.NIM:
          if (!text) {
            await ctx.reply('Please enter your NIM (student ID).', RegistrationKeyboards.cancel());
            return;
          }
          state.data.nim = text;
          state.step = STEP.CONFIRM;
          this.conversations.set(telegramId, state);
          await ctx.reply(this.summary(state), RegistrationKeyboards.confirm());
          return;

        case STEP.CONFIRM:
          if (['yes', 'y', 'submit'].includes(text.toLowerCase())) {
            return this.submit(ctx, telegramId, state);
          }
          if (['no', 'n', 'cancel'].includes(text.toLowerCase())) {
            this.conversations.clear(telegramId);
            await ctx.reply('Registration cancelled. Send /register to try again.');
            return;
          }
          await ctx.reply('👆 Please tap Submit request or Cancel.', RegistrationKeyboards.confirm());
          return;
      }
    } catch (error) {
      this.logger.error('Registration flow (text) failed', error as Error);
      this.conversations.clear(telegramId);
      await ctx.reply('Something went wrong. Please send /register to try again.');
    }
  }

  // ---- Callbacks (qm|reg|*) ------------------------------------------------

  async handleCallback(ctx: BotContext, telegramId: string, data: string): Promise<void> {
    await ctx.answerCbQuery();
    const action = data.split('|')[2] ?? '';

    if (action === 'start') {
      return this.begin(ctx, telegramId);
    }
    if (action === 'cancel') {
      this.conversations.clear(telegramId);
      await this.clearMarkup(ctx);
      await ctx.reply('Registration cancelled. Send /register to try again.');
      return;
    }
    if (action === 'submit') {
      const state = this.conversations.get(telegramId);
      if (!state || state.step !== STEP.CONFIRM) {
        await ctx.reply('That registration session has expired. Send /register to start again.');
        return;
      }
      await this.clearMarkup(ctx);
      return this.submit(ctx, telegramId, state);
    }
  }

  // ---- Submit --------------------------------------------------------------

  private async submit(ctx: BotContext, telegramId: string, state: ConversationState): Promise<void> {
    const fullName = state.data.fullName as string;
    const nim = state.data.nim as string;
    const username = ctx.from?.username ?? null;

    const request = this.store.upsert({ telegramId, fullName, nim, telegramUsername: username });
    this.conversations.clear(telegramId);

    await ctx.reply(
      '✅ Request submitted! The lab admin will review it and assign your role.\n\n' +
        '⏳ This request expires in 2 minutes — if it lapses, just send /register again.',
    );
    await this.admin.notifyNewRequest(ctx, request);
  }

  private summary(state: ConversationState): string {
    return [
      'Please review your details:',
      '',
      `Name: ${state.data.fullName as string}`,
      `NIM: ${state.data.nim as string}`,
      '',
      'Submit this registration request?',
    ].join('\n');
  }

  private async clearMarkup(ctx: BotContext): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {
      /* ignore */
    }
  }
}
