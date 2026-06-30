import { TrackingType, ItemCondition } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ItemWithRelations } from './inventory.types';

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

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: jest.Mocked<
    Pick<
      InventoryRepository,
      'create' | 'findByCode' | 'update' | 'codesWithPrefix' | 'search'
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
    service = new InventoryService(repo as unknown as InventoryRepository);
  });

  describe('generateCode', () => {
    it('produces the next code from existing prefixed codes', async () => {
      repo.codesWithPrefix.mockResolvedValue(['ASE-CABL-001', 'ASE-CABL-002']);
      await expect(service.generateCode('Cable')).resolves.toBe('ASE-CABL-003');
      expect(repo.codesWithPrefix).toHaveBeenCalledWith('ASE-CABL-');
    });
  });

  describe('createItem', () => {
    const baseInput = {
      name: 'HDMI Cable',
      categoryId: 'cat1',
      categoryName: 'Cable',
      trackingType: TrackingType.BULK_STOCK,
      quantity: 8,
    };

    it('generates a code and sets quantityAvailable equal to quantity', async () => {
      repo.codesWithPrefix.mockResolvedValue([]);
      repo.create.mockResolvedValue(fakeItem());

      await service.createItem(baseInput);

      const data = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(data.code).toBe('ASE-CABL-001');
      expect(data.quantity).toBe(8);
      expect(data.quantityAvailable).toBe(8);
    });

    it('rejects an unsupported tracking type (individual asset)', async () => {
      await expect(
        service.createItem({ ...baseInput, trackingType: TrackingType.INDIVIDUAL_ASSET }),
      ).rejects.toThrow(/Bulk Stock or Consumable/);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects a negative quantity', async () => {
      await expect(
        service.createItem({ ...baseInput, quantity: -1 }),
      ).rejects.toThrow(/Quantity/);
    });

    it('rejects an empty name', async () => {
      await expect(
        service.createItem({ ...baseInput, name: '   ' }),
      ).rejects.toThrow(/name is required/);
    });
  });

  describe('updateItem', () => {
    it('throws when the item does not exist', async () => {
      repo.findByCode.mockResolvedValue(null);
      await expect(service.updateItem('NOPE', { name: 'x' })).rejects.toThrow(
        /not found/,
      );
    });

    it('recomputes availability preserving borrowed count', async () => {
      // 8 total, 5 available => 3 borrowed. New total 10 => available 7.
      repo.findByCode.mockResolvedValue(fakeItem({ quantity: 8, quantityAvailable: 5 }));
      repo.update.mockResolvedValue(fakeItem());

      await service.updateItem('ASE-CABL-001', { quantity: 10 });

      const data = repo.update.mock.calls[0][1] as Record<string, unknown>;
      expect(data.quantity).toBe(10);
      expect(data.quantityAvailable).toBe(7);
    });

    it('rejects a negative quantity', async () => {
      repo.findByCode.mockResolvedValue(fakeItem());
      await expect(
        service.updateItem('ASE-CABL-001', { quantity: -5 }),
      ).rejects.toThrow(/Quantity/);
    });
  });

  describe('archiveItem', () => {
    it('throws when the item does not exist', async () => {
      repo.findByCode.mockResolvedValue(null);
      await expect(service.archiveItem('NOPE')).rejects.toThrow(/not found/);
    });

    it('sets isArchived to true', async () => {
      repo.findByCode.mockResolvedValue(fakeItem());
      repo.update.mockResolvedValue(fakeItem({ isArchived: true }));

      await service.archiveItem('ASE-CABL-001');

      expect(repo.update).toHaveBeenCalledWith('item1', { isArchived: true });
    });
  });
});
