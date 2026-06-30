import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Pick<UsersRepository, 'findByTelegramId' | 'findById' | 'create'>>;

  beforeEach(() => {
    repo = {
      findByTelegramId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    service = new UsersService(repo as unknown as UsersRepository);
  });

  describe('isRegistered', () => {
    it('returns true for an active registered user', async () => {
      repo.findByTelegramId.mockResolvedValue({ isActive: true } as User);
      await expect(service.isRegistered('123')).resolves.toBe(true);
    });

    it('returns false for an inactive user', async () => {
      repo.findByTelegramId.mockResolvedValue({ isActive: false } as User);
      await expect(service.isRegistered('123')).resolves.toBe(false);
    });

    it('returns false when the user does not exist', async () => {
      repo.findByTelegramId.mockResolvedValue(null);
      await expect(service.isRegistered('123')).resolves.toBe(false);
    });
  });

  describe('findByTelegramId', () => {
    it('delegates to the repository', async () => {
      const user = { id: 'u1' } as User;
      repo.findByTelegramId.mockResolvedValue(user);
      await expect(service.findByTelegramId('999')).resolves.toBe(user);
      expect(repo.findByTelegramId).toHaveBeenCalledWith('999');
    });
  });
});
