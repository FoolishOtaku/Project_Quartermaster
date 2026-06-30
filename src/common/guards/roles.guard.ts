import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../constants/roles';
import { BotContext } from '../../bot/bot.context';
import { BOT_MESSAGES } from '../../bot/bot.messages';

/**
 * Enforces @Roles() metadata. Expects RegisteredGuard to have populated
 * `ctx.state.user` first (apply guards as [RegisteredGuard, RolesGuard]).
 * Handlers without @Roles() are allowed through.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const ctx = TelegrafExecutionContext.create(context).getContext<BotContext>();
    const user = ctx.state.user;

    if (!user || !requiredRoles.includes(user.role)) {
      await ctx.reply(BOT_MESSAGES.PERMISSION_DENIED);
      return false;
    }

    return true;
  }
}
