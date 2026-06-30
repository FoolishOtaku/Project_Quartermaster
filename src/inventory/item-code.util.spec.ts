import { categoryPrefix, codePrefix, nextItemCode } from './item-code.util';

describe('item-code util', () => {
  describe('categoryPrefix', () => {
    it('uppercases and strips non-alphanumerics, max 4 chars', () => {
      expect(categoryPrefix('Cable')).toBe('CABL');
      expect(categoryPrefix('Game / Board Game')).toBe('GAME');
      expect(categoryPrefix('AIO Computer')).toBe('AIOC');
    });

    it('falls back to ITM for empty/symbol-only names', () => {
      expect(categoryPrefix('///')).toBe('ITM');
      expect(categoryPrefix('')).toBe('ITM');
    });
  });

  describe('codePrefix', () => {
    it('builds the ASE-<PREFIX>- literal', () => {
      expect(codePrefix('Cable')).toBe('ASE-CABL-');
      expect(codePrefix('Monitor')).toBe('ASE-MONI-');
    });
  });

  describe('nextItemCode', () => {
    it('starts at 001 when no codes exist', () => {
      expect(nextItemCode('Cable', [])).toBe('ASE-CABL-001');
    });

    it('increments past the highest existing sequence', () => {
      const existing = ['ASE-CABL-001', 'ASE-CABL-002', 'ASE-CABL-005'];
      expect(nextItemCode('Cable', existing)).toBe('ASE-CABL-006');
    });

    it('ignores codes from other prefixes', () => {
      const existing = ['ASE-MONI-009', 'ASE-CABL-003'];
      expect(nextItemCode('Cable', existing)).toBe('ASE-CABL-004');
    });

    it('zero-pads to three digits but grows beyond', () => {
      const existing = ['ASE-CABL-999'];
      expect(nextItemCode('Cable', existing)).toBe('ASE-CABL-1000');
    });
  });
});
