import { TrackingType } from '@prisma/client';
import { BorrowingService } from './borrowing.service';
import { BorrowingRepository } from './borrowing.repository';
import { InventoryService } from '../inventory/inventory.service';
import { ItemWithRelations, ItemUnitWithRelations } from '../inventory/inventory.types';

function fakeItem(overrides: Partial<ItemWithRelations> = {}): ItemWithRelations {
  return {
    id: 'item1',
    code: 'ASE-CABL-001',
    name: 'HDMI Cable',
    trackingType: TrackingType.BULK_STOCK,
    quantity: 8,
    quantityAvailable: 8,
    isArchived: false,
    ...overrides,
  } as ItemWithRelations;
}

function fakeUnit(overrides: Partial<ItemUnitWithRelations> = {}): ItemUnitWithRelations {
  return {
    id: 'unit1',
    itemId: 'mon1',
    unitCode: 'ASE-MON-001-U01',
    availabilityStatus: 'AVAILABLE',
    isArchived: false,
    item: fakeItem({ trackingType: TrackingType.INDIVIDUAL_ASSET, name: 'LG Monitor' }),
    ...overrides,
  } as ItemUnitWithRelations;
}

describe('BorrowingService', () => {
  let service: BorrowingService;
  let repo: jest.Mocked<
    Pick<BorrowingRepository, 'borrowQuantity' | 'borrowUnit' | 'returnRecord' | 'listActiveByBorrower' | 'listActiveByItemId' | 'findById'>
  >;
  let inventory: jest.Mocked<Pick<InventoryService, 'getByCode' | 'getUnitByCode'>>;

  const borrower = { id: 'u1', fullName: 'Zhafran' };

  beforeEach(() => {
    repo = {
      borrowQuantity: jest.fn(),
      borrowUnit: jest.fn(),
      returnRecord: jest.fn(),
      listActiveByBorrower: jest.fn(),
      listActiveByItemId: jest.fn(),
      findById: jest.fn(),
    };
    inventory = {
      getByCode: jest.fn(),
      getUnitByCode: jest.fn(),
    };
    service = new BorrowingService(
      repo as unknown as BorrowingRepository,
      inventory as unknown as InventoryService,
    );
  });

  describe('borrowQuantity', () => {
    it('borrows from a bulk item', async () => {
      inventory.getByCode.mockResolvedValue(fakeItem());
      repo.borrowQuantity.mockResolvedValue({} as never);
      await service.borrowQuantity('ASE-CABL-001', borrower, 2, 'event', null);
      expect(repo.borrowQuantity).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: 'item1', borrowerId: 'u1', quantity: 2 }),
      );
    });

    it('rejects borrowing a quantity from an individual-asset item', async () => {
      inventory.getByCode.mockResolvedValue(fakeItem({ trackingType: TrackingType.INDIVIDUAL_ASSET }));
      await expect(service.borrowQuantity('ASE-MON-001', borrower, 1)).rejects.toThrow(/individual-asset/);
    });

    it('rejects a non-positive quantity', async () => {
      inventory.getByCode.mockResolvedValue(fakeItem());
      await expect(service.borrowQuantity('ASE-CABL-001', borrower, 0)).rejects.toThrow(/1 or more/);
    });

    it('throws when the item does not exist', async () => {
      inventory.getByCode.mockResolvedValue(null);
      await expect(service.borrowQuantity('NOPE', borrower, 1)).rejects.toThrow(/not found/);
    });
  });

  describe('borrowUnit', () => {
    it('borrows a specific unit', async () => {
      inventory.getUnitByCode.mockResolvedValue(fakeUnit());
      repo.borrowUnit.mockResolvedValue({} as never);
      await service.borrowUnit('ASE-MON-001-U01', borrower, null, null);
      expect(repo.borrowUnit).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: 'mon1', itemUnitId: 'unit1', borrowerId: 'u1' }),
      );
    });

    it('throws when the unit does not exist', async () => {
      inventory.getUnitByCode.mockResolvedValue(null);
      await expect(service.borrowUnit('NOPE', borrower)).rejects.toThrow(/not found/);
    });
  });

  describe('returnRecord', () => {
    it('delegates to the repository with the condition', async () => {
      repo.returnRecord.mockResolvedValue({} as never);
      await service.returnRecord('rec1', 'GOOD');
      expect(repo.returnRecord).toHaveBeenCalledWith('rec1', 'GOOD');
    });

    it('passes null when no condition is given', async () => {
      repo.returnRecord.mockResolvedValue({} as never);
      await service.returnRecord('rec1');
      expect(repo.returnRecord).toHaveBeenCalledWith('rec1', null);
    });
  });

  describe('listActiveByItemCode', () => {
    it('returns null when the item is missing', async () => {
      inventory.getByCode.mockResolvedValue(null);
      await expect(service.listActiveByItemCode('NOPE')).resolves.toBeNull();
    });

    it('returns the item and its active records', async () => {
      inventory.getByCode.mockResolvedValue(fakeItem());
      repo.listActiveByItemId.mockResolvedValue([{ id: 'r1' }] as never);
      const result = await service.listActiveByItemCode('ASE-CABL-001');
      expect(result?.records).toHaveLength(1);
      expect(repo.listActiveByItemId).toHaveBeenCalledWith('item1');
    });
  });
});
