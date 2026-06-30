import { UserRole } from '@prisma/client';

export interface CreateUserInput {
  telegramId: string;
  fullName: string;
  telegramUsername?: string | null;
  nim?: string | null;
  role?: UserRole;
}
