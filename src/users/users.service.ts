import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { CreateUserInput } from './users.types';

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
}
