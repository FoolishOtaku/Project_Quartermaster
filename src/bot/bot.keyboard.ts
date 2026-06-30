import { Markup } from 'telegraf';

/**
 * Keyboard/markup helpers. Kept intentionally small for v0.1.0;
 * inline keyboards for inventory and confirmation flows arrive in v0.2.0+.
 */
export const BotKeyboard = {
  removeKeyboard: () => Markup.removeKeyboard(),
};
