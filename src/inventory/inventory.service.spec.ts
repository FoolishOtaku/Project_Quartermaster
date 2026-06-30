import { TrackingType, ItemCondition } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ItemUnitRepository } from './item-unit.repository';
import { ItemUnitWithRelations, ItemWithRelations } from './inventory.types';

function fakeItem(overrides: Partial<ItemWithRelations> = {}): ItemWithRelations {
  return {
    id: 'item1',
    code: 'ASE-CABL-001',
    name: 'HDMI Cable',
    categoryId: 'cat1',
    subcategory: null,
    trackingType: TrackingType.BULK_STOCK,
    brandModel: null,
    description: null,
    serialNumber: null,
    assetTag: null,
    quantity: 8,
    quantityAvailable: 8,
    unit: 'pcs',
    minimumStock: 3,
    condition: ItemCondition.GOOD,
    availabilityStatus: 'AVAILABLE',
    locationId: null,
    storageDetail: null,
    responsiblePic: null,
    ownerSource: 'LAB_PURCHASE',
    ownerName: null,
    acquiredAt: null,
    purchasePrice: null,
    warrantyExpiry: null,
    lastCheckedDate: null,
    checkFrequencyDays: null,
    nextCheckDue: null,
    photoLink: null,
    notes: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: 'cat1', name: 'Cable', isArchived: false, createdAt: new Date(), updatedAt: new Date() },
    location: null,
    ...overrides,
  } as ItemWithRelations;
}

function fakeUnit(overrides: Partial<ItemUnitWithRelations> = {}): ItemUnitWithRelations {
  return {
    id: 'unit1',
    itemId: 'item1',
    unitCode: 'ASE-MON-001-U01',
    serialNumber: null,
    brandModel: null,
    specs: null,
    condition: ItemCondition.GOOD,
    availabilityStatus: 'AVAILABLE',
    locationId: null,
    storageDetail: null,
    warrantyExpiry: null,
    notes: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    location: null,
    item: fakeItem({ trackingType: TrackingType.INDIVIDUAL_ASSET }),
    ...overrides,
  } as ItemUnitWithRelations;
}

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: jest.Mocked<
    Pick<InventoryRepository, 'create' | 'findByCode' | 'update' | 'codesWithPrefix' | 'search'>
  >;
  let unitRepo: jest.Mocked<
    Pick<
      ItemUnitRepository,
      'create' | 'findByCode' | 'update' | 'listByItemId' | 'unitCodesByItemId' | 'countsByItemId'
    >
  >;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findByCode: jest.fn(),
      update: jest.fn(),
      codesWithPrefix: jest.fn(),
      search: jest.fn(),
    };
    unitRepo = {
      create: jest.fn(),
      findByCode: jest.fn(),
      update: jest.fn(),
      listByItemId: jest.fn(),
      unitCodesByItemId: jest.fn(),
      countsByItemId: jest.fn(),
    };
    service = new InventoryService(
      repo as unknown as InventoryRepository,
      unitRepo as unknown as ItemUnitRepository,
    );
  });

  describe('createItem', () => {
    const baseInput = {
      name: 'HDMI Cable',
      categoryId: 'cat1',
      categoryName: 'Cable',
      trackingType: TrackingType.BULK_STOCK,
      quantity: 8,
    };

    it('generates a code and sets quantityAvailable equal to quantity (bulk)', async () => {
      repo.codesWithPrefix.mockResolvedValue([]);
      repo.create.mockResolvedValue(fakeItem());
      await service.createItem(baseInput);
      const data = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(data.code).toBe('ASE-CABL-001');
      expect(data.quantity).toBe(8);
      expect(data.quantityAvailable).toBe(8);
    });

    it('creates an individual-asset item with zero units', async () => {
      repo.codesWithPrefix.mockResolvedValue([]);
      repo.create.mockResolvedValue(fakeItem({ trackingType: TrackingType.INDIVIDUAL_ASSET }));
      await service.createItem({
        name: 'LG Monitor',
        categoryId: 'cat2',
        categoryName: 'Monitor',
        trackingType: TrackingType.INDIVIDUAL_ASSET,
        brandModel: 'LG 24MP',
      });
      const data = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(data.quantity).toBe(0);
      expect(data.quantityAvailable).toBe(0);
      expect(data.brandModel).toBe('LG 24MP');
      expect(data.unit).toBeNull();
    });

    it('rejects a negative quantity for bulk items', async () => {
      await expect(service.createItem({ ...baseInput, quantity: -1 })).rejects.toThrow(/Quantity/);
    });
  });

  describe('addUnit', () => {
    it('rejects adding a unit to a non-individual item', async () => {
      repo.findByCode.mockResolvedValue(fakeItem({ trackingType: TrackingType.BULK_STOCK }));
      await expect(service.addUnit('ASE-CABL-001', {})).rejects.toThrow(/individual-asset/);
    });

    it('generates a unit code, creates the unit, and recomputes counts', async () => {
      repo.findByCode.mockResolvedValue(
        fakeItem({ id: 'mon1', code: 'ASE-MON-001', trackingType: TrackingType.INDIVIDUAL_ASSET }),
      );
      unitRepo.unitCodesByItemId.mockResolvedValue(['ASE-MON-001-U01']);
      unitRepo.create.mockResolvedValue(fakeUnit({ unitCode: 'ASE-MON-001-U02' }));
      unitRepo.countsByItemId.mockResolvedValue({ total: 2, available: 2 });
      repo.update.mockResolvedValue(fakeItem());

      await service.addUnit('ASE-MON-001', { condition: ItemCondition.GOOD });

      const data = unitRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(data.unitCode).toBe('ASE-MON-001-U02');
      // recompute called
      expect(repo.update).toHaveBeenCalledWith('mon1', { quantity: 2, quantityAvailable: 2 });
    });
  });

  describe('updateUnit', () => {
    it('recomputes item counts when availability changes', async () => {
      unitRepo.findByCode.mockResolvedValue(fakeUnit({ itemId: 'mon1' }));
      unitRepo.update.mockResolvedValue(fakeUnit({ availabilityStatus: 'MAINTENANCE' }));
      unitRepo.countsByItemId.mockResolvedValue({ total: 2, available: 1 });
      repo.update.mockResolvedValue(fakeItem());

      await service.updateUnit('ASE-MON-001-U01', { availabilityStatus: 'MAINTENANCE' });

      expect(repo.update).toHaveBeenCalledWith('mon1', { quantity: 2, quantityAvailable: 1 });
    });

    it('does not recompute when only notes change', async () => {
      unitRepo.findByCode.mockResolvedValue(fakeUnit({ itemId: 'mon1' }));
      unitRepo.update.mockResolvedValue(fakeUnit());

      await service.updateUnit('ASE-MON-001-U01', { notes: 'scratched' });

      expect(unitRepo.countsByItemId).not.toHaveBeenCalled();
    });
  });

  describe('archiveUnit', () => {
    it('archives the unit and recomputes counts', async () => {
      unitRepo.findByCode.mockResolvedValue(fakeUnit({ id: 'u9', itemId: 'mon1' }));
      unitRepo.update.mockResolvedValue(fakeUnit({ isArchived: true }));
      unitRepo.countsByItemId.mockResolvedValue({ total: 1, available: 1 });
      repo.update.mockResolvedValue(fakeItem());

      await service.archiveUnit('ASE-MON-001-U01');

      expect(unitRepo.update).toHaveBeenCalledWith('u9', { isArchived: true });
      expect(repo.update).toHaveBeenCalledWith('mon1', { quantity: 1, quantityAvailable: 1 });
    });
  });

  describe('updateItem', () => {
    it('blocks quantity edits on individual-asset items', async () => {
      repo.findByCode.mockResolvedValue(fakeItem({ trackingType: TrackingType.INDIVIDUAL_ASSET }));
      await expect(
        service.updateItem('ASE-MON-001', { quantity: 5 }),
      ).rejects.toThrow(/managed by its units/);
    });
  });
});
