import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserInput, UpdateUserInput } from './users.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTelegramId(telegramId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { telegramId } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        telegramId: input.telegramId,
        fullName: input.fullName,
        telegramUsername: input.telegramUsername ?? null,
        nim: input.nim ?? null,
        role: input.role,
      },
    });
  }

  /** Users ordered by creation, capped (for the admin manage-users list). */
  list(take = 25): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  /** Update a user identified by Telegram id; returns null if none exists. */
  async updateByTelegramId(
    telegramId: string,
    data: UpdateUserInput,
  ): Promise<User | null> {
    const existing = await this.prisma.user.findUnique({ where: { telegramId } });
    if (!existing) return null;
    return this.prisma.user.update({ where: { telegramId }, data });
  }
}
