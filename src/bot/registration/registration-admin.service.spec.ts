import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { RegistrationAdminService } from './registration-admin.service';
import { RegistrationStore } from './registration.store';

const MAIN_ADMIN_ID = '999';

function makeCtx() {
  return {
    answerCbQuery: jest.fn().mockResolvedValue(true),
    reply: jest.fn().mockResolvedValue(true),
    editMessageText: jest.fn().mockResolvedValue(true),
    telegram: { sendMessage: jest.fn().mockResolvedValue(true) },
  } as any;
}

describe('RegistrationAdminService', () => {
  let service: RegistrationAdminService;
  let store: RegistrationStore;
  let users: jest.Mocked<Pick<UsersService, 'findByTelegramId' | 'create' | 'list' | 'setRoleByTelegramId' | 'setActiveByTelegramId' | 'updateByTelegramId'>>;

  beforeEach(() => {
    store = new RegistrationStore();
    users = {
      findByTelegramId: jest.fn(),
      create: jest.fn(),
      list: jest.fn(),
      setRoleByTelegramId: jest.fn(),
      setActiveByTelegramId: jest.fn(),
      updateByTelegramId: jest.fn(),
    } as any;
    const config = { get: (key: string) => (key === 'ADMIN_TELEGRAM_ID' ? MAIN_ADMIN_ID : undefined) } as ConfigService;
    service = new RegistrationAdminService(config, users as unknown as UsersService, store);
  });

  it('identifies only the configured account as main admin', () => {
    expect(service.isMainAdmin(MAIN_ADMIN_ID)).toBe(true);
    expect(service.isMainAdmin('123')).toBe(false);
    expect(service.isMainAdmin(undefined)).toBe(false);
  });

  it('blocks non-main-admins from the panel', async () => {
    const ctx = makeCtx();
    await service.handleCallback(ctx, '123', 'qm|adm|reqs');
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Only the main admin'));
    expect(users.list).not.toHaveBeenCalled();
  });

  it('approves a pending request by creating the user with the chosen role and notifying them', async () => {
    store.upsert({ telegramId: '123', fullName: 'Budi', nim: '1301999', telegramUsername: 'budi' });
    users.findByTelegramId.mockResolvedValue(null);
    users.create.mockResolvedValue({ id: 'u1' } as any);

    const ctx = makeCtx();
    await service.handleCallback(ctx, MAIN_ADMIN_ID, `qm|adm|setnew|123|${UserRole.ASSISTANT}`);

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ telegramId: '123', role: UserRole.ASSISTANT, nim: '1301999' }),
    );
    expect(store.has('123')).toBe(false); // request consumed
    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith('123', expect.stringContaining('registered'));
  });

  it('reactivates/updates an existing user instead of creating a duplicate', async () => {
    store.upsert({ telegramId: '123', fullName: 'Budi', nim: '1301999', telegramUsername: null });
    users.findByTelegramId.mockResolvedValue({ id: 'u1', telegramId: '123' } as any);

    const ctx = makeCtx();
    await service.handleCallback(ctx, MAIN_ADMIN_ID, `qm|adm|setnew|123|${UserRole.VIEWER}`);

    expect(users.create).not.toHaveBeenCalled();
    expect(users.updateByTelegramId).toHaveBeenCalledWith(
      '123',
      expect.objectContaining({ role: UserRole.VIEWER, isActive: true }),
    );
  });

  it('reports an expired request gracefully', async () => {
    // No request in the store.
    const ctx = makeCtx();
    await service.handleCallback(ctx, MAIN_ADMIN_ID, `qm|adm|setnew|123|${UserRole.VIEWER}`);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('refuses to change the main admin account', async () => {
    const ctx = makeCtx();
    await service.handleCallback(ctx, MAIN_ADMIN_ID, `qm|adm|setrole|${MAIN_ADMIN_ID}|${UserRole.VIEWER}`);
    expect(users.setRoleByTelegramId).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('cannot be changed'));
  });

  it('refuses to deactivate the main admin account', async () => {
    const ctx = makeCtx();
    await service.handleCallback(ctx, MAIN_ADMIN_ID, `qm|adm|deact|${MAIN_ADMIN_ID}`);
    expect(users.setActiveByTelegramId).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('cannot be deactivated'));
  });

  it('changes an existing (non-main) user role and notifies them', async () => {
    users.setRoleByTelegramId.mockResolvedValue({ telegramId: '123' } as any);
    users.findByTelegramId.mockResolvedValue({
      telegramId: '123',
      fullName: 'Budi',
      nim: '1301999',
      telegramUsername: null,
      role: UserRole.TRUSTED_MEMBER,
      isActive: true,
    } as any);

    const ctx = makeCtx();
    await service.handleCallback(ctx, MAIN_ADMIN_ID, `qm|adm|setrole|123|${UserRole.COORDINATOR}`);

    expect(users.setRoleByTelegramId).toHaveBeenCalledWith('123', UserRole.COORDINATOR);
    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith('123', expect.stringContaining('role'));
  });
});
