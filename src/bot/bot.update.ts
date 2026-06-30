import { OnModuleInit, UseGuards } from '@nestjs/common';
import { Command, Ctx, Help, InjectBot, Start, Update } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { User } from '@prisma/client';
import { BotContext } from './bot.context';
import { BotService } from './bot.service';
import { BOT_MESSAGES } from './bot.messages';
import { MenuKeyboards } from './flows/menu.keyboard';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { CtxUser } from '../common/decorators/ctx-user.decorator';

/** Commands surfaced in Telegram's native "/" command menu. */
const TELEGRAM_COMMANDS: { command: string; description: string }[] = [
  { command: 'menu', description: 'Open the interactive button menu' },
  { command: 'help', description: 'Show the full command list' },
  { command: 'me', description: 'Show your account and role' },
  { command: 'search_item', description: 'Search inventory by keyword' },
  { command: 'view_item', description: 'View one item by code' },
  { command: 'add_item', description: 'Add a new item (admin/assistant)' },
  { command: 'update_item', description: 'Update an item (admin/assistant)' },
  { command: 'archive_item', description: 'Archive an item (admin)' },
  { command: 'view_unit', description: 'View one physical unit' },
  { command: 'add_unit', description: 'Add a unit (admin/assistant)' },
  { command: 'update_unit', description: 'Update a unit (admin/assistant)' },
  { command: 'archive_unit', description: 'Archive a unit (admin)' },
  { command: 'borrow_item', description: 'Borrow an item or unit' },
  { command: 'return_item', description: 'Return something you borrowed' },
  { command: 'who_has', description: 'See who currently holds an item' },
  { command: 'my_borrowed', description: 'See what you currently have' },
  { command: 'report', description: 'Generate an inventory report' },
  { command: 'export_report', description: 'Export a report as CSV' },
];

@Update()
export class BotUpdate implements OnModuleInit {
  constructor(
    private readonly botService: BotService,
    @InjectBot() private readonly bot: Telegraf<BotContext>,
  ) {}

  /** Register the Telegram command list so "/" shows tappable commands. */
  async onModuleInit(): Promise<void> {
    try {
      await this.bot.telegram.setMyCommands(TELEGRAM_COMMANDS);
    } catch {
      // Non-fatal: the bot still works without the native command hints.
    }
  }

  /** /start — open to everyone. */
  @Start()
  async onStart(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.reply(BOT_MESSAGES.START, {
      parse_mode: 'Markdown',
      ...MenuKeyboards.openButton(),
    });
  }

  /** /help — open to everyone. */
  @Help()
  async onHelp(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.reply(BOT_MESSAGES.HELP, MenuKeyboards.openButton());
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
