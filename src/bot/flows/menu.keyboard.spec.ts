import { UserRole } from '@prisma/client';
import { MenuKeyboards, MENU, canArchive, canBorrow, canManage } from './menu.keyboard';

type Row = { text: string; callback_data?: string }[];

function datas(markup: { reply_markup: { inline_keyboard: Row[] } }): (string | undefined)[] {
  return markup.reply_markup.inline_keyboard.flat().map((b) => b.callback_data);
}

describe('MenuKeyboards (role-aware)', () => {
  it('always shows read actions and profile/help to every role', () => {
    for (const role of Object.values(UserRole)) {
      const d = datas(MenuKeyboards.main(role));
      expect(d).toEqual(
        expect.arrayContaining([
          MENU.SEARCH,
          MENU.VIEW_ITEM,
          MENU.VIEW_UNIT,
          MENU.WHO_HAS,
          MENU.MY_BORROWED,
          MENU.PROFILE,
          MENU.HELP,
        ]),
      );
    }
  });

  it('hides borrow/return and manage from a VIEWER', () => {
    const d = datas(MenuKeyboards.main(UserRole.VIEWER));
    expect(d).not.toContain(MENU.BORROW);
    expect(d).not.toContain(MENU.RETURN);
    expect(d).not.toContain(MENU.MANAGE);
  });

  it('shows borrow/return to a trusted member but not manage', () => {
    const d = datas(MenuKeyboards.main(UserRole.TRUSTED_MEMBER));
    expect(d).toEqual(expect.arrayContaining([MENU.BORROW, MENU.RETURN]));
    expect(d).not.toContain(MENU.MANAGE);
  });

  it('shows manage to an assistant and admin', () => {
    expect(datas(MenuKeyboards.main(UserRole.ASSISTANT))).toContain(MENU.MANAGE);
    expect(datas(MenuKeyboards.main(UserRole.ADMIN))).toContain(MENU.MANAGE);
  });

  it('shows archive only to admin in the manage submenu', () => {
    const assistant = datas(MenuKeyboards.manage(UserRole.ASSISTANT));
    expect(assistant).toEqual(expect.arrayContaining([MENU.ADD_ITEM, MENU.UPDATE_UNIT]));
    expect(assistant).not.toContain(MENU.ARCHIVE_ITEM);
    expect(assistant).not.toContain(MENU.ARCHIVE_UNIT);

    const admin = datas(MenuKeyboards.manage(UserRole.ADMIN));
    expect(admin).toEqual(expect.arrayContaining([MENU.ARCHIVE_ITEM, MENU.ARCHIVE_UNIT]));
  });

  it('keeps every menu callback within Telegram 64-byte limit', () => {
    const all = [
      ...datas(MenuKeyboards.main(UserRole.ADMIN)),
      ...datas(MenuKeyboards.manage(UserRole.ADMIN)),
      ...datas(MenuKeyboards.openButton()),
    ].filter((d): d is string => !!d);
    for (const d of all) {
      expect(Buffer.byteLength(d, 'utf8')).toBeLessThanOrEqual(64);
    }
  });

  it('shows the Admin panel button only when isMainAdmin is set', () => {
    expect(datas(MenuKeyboards.main(UserRole.ADMIN))).not.toContain('qm|adm|home');
    expect(datas(MenuKeyboards.main(UserRole.ADMIN, { isMainAdmin: true }))).toContain('qm|adm|home');
    // A non-admin role that is somehow the main admin still gets the panel button.
    expect(datas(MenuKeyboards.main(UserRole.VIEWER, { isMainAdmin: true }))).toContain('qm|adm|home');
  });

  it('exposes consistent role predicates', () => {
    expect(canBorrow(UserRole.VIEWER)).toBe(false);
    expect(canBorrow(UserRole.TRUSTED_MEMBER)).toBe(true);
    expect(canManage(UserRole.ASSISTANT)).toBe(true);
    expect(canManage(UserRole.COORDINATOR)).toBe(false);
    expect(canArchive(UserRole.ADMIN)).toBe(true);
    expect(canArchive(UserRole.ASSISTANT)).toBe(false);
  });
});
