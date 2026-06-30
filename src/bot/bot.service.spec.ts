import { User, UserRole } from '@prisma/client';
import { BotService } from './bot.service';

describe('BotService', () => {
  const service = new BotService();

  const baseUser: User = {
    id: '1',
    telegramId: '123456789',
    telegramUsername: 'zhafran',
    fullName: 'Muhammad Zhafran',
    nim: '1301229999',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('includes name, role label, username, NIM, and telegram id', () => {
    const msg = service.buildProfileMessage(baseUser);
    expect(msg).toContain('Muhammad Zhafran');
    expect(msg).toContain('Admin');
    expect(msg).toContain('@zhafran');
    expect(msg).toContain('1301229999');
    expect(msg).toContain('123456789');
    expect(msg).toContain('Active');
  });

  it('omits optional fields when missing', () => {
    const msg = service.buildProfileMessage({
      ...baseUser,
      nim: null,
      telegramUsername: null,
    });
    expect(msg).not.toContain('NIM:');
    expect(msg).not.toContain('Username:');
  });

  it('maps each role to its label', () => {
    const msg = service.buildProfileMessage({
      ...baseUser,
      role: UserRole.TRUSTED_MEMBER,
    });
    expect(msg).toContain('Trusted Member');
  });
});
