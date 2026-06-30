import { UserRole } from '@prisma/client';

export interface CreateUserInput {
  telegramId: string;
  fullName: string;
  telegramUsername?: string | null;
  nim?: string | null;
  role?: UserRole;
}

/** Fields the main admin may change on an existing user. */
export interface UpdateUserInput {
  fullName?: string;
  telegramUsername?: string | null;
  nim?: string | null;
  role?: UserRole;
  isActive?: boolean;
}
