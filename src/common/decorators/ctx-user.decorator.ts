import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { BotContext } from '../../bot/bot.context';

/**
 * Injects the resolved Quartermaster user from the Telegraf context.
 * Only meaningful on handlers protected by RegisteredGuard.
 */
export const CtxUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = TelegrafExecutionContext.create(context).getContext<BotContext>();
    return ctx.state.user;
  },
);
