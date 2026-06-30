import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { UsersService } from '../../users/users.service';
import { BotContext } from '../../bot/bot.context';
import { BOT_MESSAGES } from '../../bot/bot.messages';

/**
 * Allows the handler only for registered, active users.
 * On success, attaches the resolved user to `ctx.state.user`.
 * On failure, replies with an explanatory message and blocks the handler.
 */
@Injectable()
export class RegisteredGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = TelegrafExecutionContext.create(context).getContext<BotContext>();
    const telegramId = ctx.from?.id?.toString();

    if (!telegramId) {
      await ctx.reply(BOT_MESSAGES.GENERIC_ERROR);
      return false;
    }

    const user = await this.usersService.findByTelegramId(telegramId);

    if (!user) {
      await ctx.reply(BOT_MESSAGES.NOT_REGISTERED);
      return false;
    }

    if (!user.isActive) {
      await ctx.reply(BOT_MESSAGES.INACTIVE);
      return false;
    }

    ctx.state.user = user;
    return true;
  }
}
