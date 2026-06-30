import { Category, Location } from '@prisma/client';
import { Keyboards } from './keyboards';

type Row = { text: string; callback_data?: string }[];

function rows(markup: { reply_markup: { inline_keyboard: Row[] } }): Row[] {
  return markup.reply_markup.inline_keyboard;
}

function allButtons(markup: { reply_markup: { inline_keyboard: Row[] } }) {
  return rows(markup).flat();
}

const fakeCategory = (id: string, name: string): Category =>
  ({ id, name, isArchived: false, createdAt: new Date(), updatedAt: new Date() } as Category);

const fakeLocation = (id: string, name: string): Location =>
  ({ id, name, isArchived: false, createdAt: new Date(), updatedAt: new Date() } as Location);

describe('Keyboards callback data', () => {
  it('encodes category ids and stays within 64 bytes', () => {
    const uuid = '11111111-2222-3333-4444-555555555555';
    const kb = Keyboards.categories([fakeCategory(uuid, 'Cable')]);
    const btn = allButtons(kb).find((b) => b.text === 'Cable');
    expect(btn?.callback_data).toBe(`qm|a|cat|${uuid}`);
    expect(Buffer.byteLength(btn!.callback_data!, 'utf8')).toBeLessThanOrEqual(64);
  });

  it('includes a Skip and Cancel control on the location keyboard', () => {
    const kb = Keyboards.locations([fakeLocation('loc-1', 'Cable Box')]);
    const datas = allButtons(kb).map((b) => b.callback_data);
    expect(datas).toContain('qm|a|loc|loc-1');
    expect(datas).toContain('qm|a|skip');
    expect(datas).toContain('qm|cancel');
  });

  it('uses enum keys for tracking, condition, owner, and confirm', () => {
    expect(allButtons(Keyboards.tracking()).map((b) => b.callback_data)).toEqual(
      expect.arrayContaining(['qm|a|trk|BULK_STOCK', 'qm|a|trk|CONSUMABLE']),
    );
    expect(allButtons(Keyboards.condition()).map((b) => b.callback_data)).toEqual(
      expect.arrayContaining(['qm|a|con|GOOD', 'qm|a|con|NEEDS_REPAIR']),
    );
    expect(allButtons(Keyboards.ownerSource()).map((b) => b.callback_data)).toEqual(
      expect.arrayContaining(['qm|a|own|LAB_PURCHASE']),
    );
    expect(allButtons(Keyboards.confirmAdd()).map((b) => b.callback_data)).toEqual(
      expect.arrayContaining(['qm|a|cfm|yes', 'qm|cancel']),
    );
  });

  it('builds an indexed field picker for update', () => {
    const kb = Keyboards.updateFields(['Name', 'Quantity']);
    const datas = allButtons(kb).map((b) => b.callback_data);
    expect(datas).toContain('qm|u|fld|0');
    expect(datas).toContain('qm|u|fld|1');
  });
});
