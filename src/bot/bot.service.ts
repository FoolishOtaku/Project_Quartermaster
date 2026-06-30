import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { ROLE_LABELS } from '../common/constants/roles';

@Injectable()
export class BotService {
  /**
   * Builds the /me reply for a registered user.
   * Optional fields (NIM, username) are omitted when missing.
   */
  buildProfileMessage(user: User): string {
    const lines: (string | null)[] = [
      '*Your Account*',
      '',
      `Name: ${user.fullName}`,
      user.nim ? `NIM: ${user.nim}` : null,
      user.telegramUsername ? `Username: @${user.telegramUsername}` : null,
      `Telegram ID: ${user.telegramId}`,
      `Role: ${ROLE_LABELS[user.role]}`,
      `Status: ${user.isActive ? 'Active' : 'Inactive'}`,
    ];

    return lines.filter((line): line is string => line !== null).join('\n');
  }
}
