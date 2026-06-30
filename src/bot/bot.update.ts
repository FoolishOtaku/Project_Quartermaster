import { UseGuards } from '@nestjs/common';
import { Command, Ctx, Help, Start, Update } from 'nestjs-telegraf';
import { User } from '@prisma/client';
import { BotContext } from './bot.context';
import { BotService } from './bot.service';
import { BOT_MESSAGES } from './bot.messages';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { CtxUser } from '../common/decorators/ctx-user.decorator';

@Update()
export class BotUpdate {
  constructor(private readonly botService: BotService) {}

  /** /start — open to everyone. */
  @Start()
  async onStart(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.reply(BOT_MESSAGES.START, { parse_mode: 'Markdown' });
  }

  /** /help — open to everyone. */
  @Help()
  async onHelp(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.reply(BOT_MESSAGES.HELP);
  }

  /** /me — registered, active users only. */
  @UseGuards(RegisteredGuard)
  @Command('me')
  async onMe(@CtxUser() user: User, @Ctx() ctx: BotContext): Promise<void> {
    await ctx.reply(this.botService.buildProfileMessage(user), {
      parse_mode: 'Markdown',
    });
  }
}
