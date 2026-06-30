import { Injectable } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { CreateUserInput, UpdateUserInput } from './users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByTelegramId(telegramId: string): Promise<User | null> {
    return this.usersRepository.findByTelegramId(telegramId);
  }

  /**
   * A user counts as registered only when the account exists AND is active.
   */
  async isRegistered(telegramId: string): Promise<boolean> {
    const user = await this.findByTelegramId(telegramId);
    return Boolean(user && user.isActive);
  }

  create(input: CreateUserInput): Promise<User> {
    return this.usersRepository.create(input);
  }

  /** List users for the admin management view (capped). */
  list(take = 25): Promise<User[]> {
    return this.usersRepository.list(take);
  }

  updateByTelegramId(telegramId: string, data: UpdateUserInput): Promise<User | null> {
    return this.usersRepository.updateByTelegramId(telegramId, data);
  }

  setRoleByTelegramId(telegramId: string, role: UserRole): Promise<User | null> {
    return this.usersRepository.updateByTelegramId(telegramId, { role });
  }

  setActiveByTelegramId(telegramId: string, isActive: boolean): Promise<User | null> {
    return this.usersRepository.updateByTelegramId(telegramId, { isActive });
  }
}
