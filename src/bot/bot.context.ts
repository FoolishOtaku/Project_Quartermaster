import { User } from '@prisma/client';
import { Context } from 'telegraf';

/**
 * Telegraf context extended with the resolved Quartermaster user.
 * Guards populate `state.user` after a successful registration check.
 */
export interface BotContext extends Context {
  state: {
    user?: User;
  };
}
