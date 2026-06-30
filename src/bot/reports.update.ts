import { UseGuards } from '@nestjs/common';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import { UserRole } from '@prisma/client';
import { BotContext } from './bot.context';
import { ReportsService } from '../reports/reports.service';
import { REPORT_META, REPORT_KINDS, isReportKind } from '../reports/reports.types';
import { ReportKeyboards } from './flows/menu.keyboard';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

/** Roles allowed to run reports (the logistics / management roles). */
export const REPORT_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.ASSISTANT,
];

/** A typed list of available report kinds for the `/report` chooser text. */
export function reportListText(): string {
  const lines = REPORT_KINDS.map(
    (k, i) => `${i + 1}. ${REPORT_META[k].label} — /report ${k}`,
  );
  return [
    'Choose a report:',
    '',
    ...lines,
    '',
    'Run one with /report <kind>, e.g. /report low_stock.',
    'Export any report as CSV with /export_report <kind>.',
  ].join('\n');
}

@Update()
export class ReportsUpdate {
  constructor(private readonly reports: ReportsService) {}

  /** /report [kind] — show the chooser, or run a specific report. */
  @Roles(...REPORT_ROLES)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('report')
  async onReport(@Ctx() ctx: BotContext): Promise<void> {
    const arg = this.getArgs(ctx).toLowerCase();
    if (!arg) {
      await ctx.reply(reportListText(), ReportKeyboards.list());
      return;
    }
    if (!isReportKind(arg)) {
      await ctx.reply(`Unknown report "${arg}".\n\n${reportListText()}`, ReportKeyboards.list());
      return;
    }
    const body = await this.reports.text(arg);
    await ctx.reply(body, ReportKeyboards.afterReport(arg));
  }

  /** /export_report <kind> — send the report as a CSV file. */
  @Roles(...REPORT_ROLES)
  @UseGuards(RegisteredGuard, RolesGuard)
  @Command('export_report')
  async onExport(@Ctx() ctx: BotContext): Promise<void> {
    const arg = this.getArgs(ctx).toLowerCase();
    if (!arg || !isReportKind(arg)) {
      await ctx.reply(
        'Usage: /export_report <kind>\nExample: /export_report inventory\n\n' + reportListText(),
      );
      return;
    }
    const { filename, content } = await this.reports.csv(arg);
    await ctx.replyWithDocument(
      { source: Buffer.from(content, 'utf8'), filename },
      { caption: `${this.reports.title(arg)} — CSV export` },
    );
  }

  // ---- helpers -------------------------------------------------------------

  private getArgs(ctx: BotContext): string {
    const msg = ctx.message;
    const text = msg && 'text' in msg ? msg.text : '';
    const idx = text.indexOf(' ');
    return idx === -1 ? '' : text.slice(idx + 1).trim();
  }
}
