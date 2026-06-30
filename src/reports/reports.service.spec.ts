import { Test } from '@nestjs/testing';
import {
  AvailabilityStatus,
  ItemCondition,
  OwnerSource,
  TrackingType,
} from '@prisma/client';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';
import { ItemWithRelations } from '../inventory/inventory.types';
import { BorrowWithRelations } from '../borrowing/borrowing.types';
import { InventorySummary, OwnershipBreakdown, REPORT_KINDS } from './reports.types';

function fakeItem(overrides: Partial<ItemWithRelations> = {}): ItemWithRelations {
  return {
    id: 'item-1',
    code: 'ASE-CABL-001',
    name: 'HDMI Cable',
    categoryId: 'cat-1',
    subcategory: null,
    trackingType: TrackingType.BULK_STOCK,
    brandModel: null,
    description: null,
    serialNumber: null,
    assetTag: null,
    quantity: 8,
    quantityAvailable: 2,
    unit: 'pcs',
    minimumStock: 3,
    condition: ItemCondition.GOOD,
    availabilityStatus: AvailabilityStatus.AVAILABLE,
    locationId: 'loc-1',
    storageDetail: null,
    responsiblePic: null,
    ownerSource: OwnerSource.LAB_PURCHASE,
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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    category: { id: 'cat-1', name: 'Cable', isArchived: false, createdAt: new Date(), updatedAt: new Date() },
    location: { id: 'loc-1', name: 'Cable Box', isArchived: false, createdAt: new Date(), updatedAt: new Date() },
    ...overrides,
  } as ItemWithRelations;
}

function fakeBorrow(overrides: Partial<BorrowWithRelations> = {}): BorrowWithRelations {
  return {
    id: 'rec-1',
    borrowerId: 'user-1',
    borrowerName: 'Farhan',
    borrowerContact: null,
    itemId: 'item-1',
    itemUnitId: null,
    quantity: 1,
    borrowedAt: new Date('2026-06-20'),
    dueDate: null,
    returnedAt: null,
    returnCondition: null,
    approvedById: null,
    purpose: 'Event setup',
    notes: null,
    status: 'BORROWED',
    createdAt: new Date('2026-06-20'),
    updatedAt: new Date('2026-06-20'),
    borrower: null,
    item: fakeItem(),
    itemUnit: null,
    ...overrides,
  } as BorrowWithRelations;
}

const SUMMARY: InventorySummary = {
  totalItemTypes: 86,
  bulkConsumableItems: 61,
  individualAssetItems: 25,
  totalUnitTrackedAssets: 30,
  availableItems: 74,
  currentlyBorrowed: 8,
  damagedItems: 4,
  lostItems: 1,
  unknownLocation: 7,
  memberOwnedItems: 11,
  lowStockItems: 5,
};

const OWNERSHIP: OwnershipBreakdown = {
  LAB_PURCHASE: 60,
  UNIVERSITY_ASSET: 10,
  DONATION: 6,
  PERSONAL_LOAN: 5,
  UNKNOWN: 5,
};

describe('ReportsService', () => {
  let service: ReportsService;
  let repo: jest.Mocked<ReportsRepository>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<ReportsRepository>> = {
      summary: jest.fn().mockResolvedValue(SUMMARY),
      borrowedActive: jest.fn().mockResolvedValue([fakeBorrow()]),
      damagedItems: jest.fn().mockResolvedValue([fakeItem({ condition: ItemCondition.BROKEN })]),
      lostItems: jest.fn().mockResolvedValue([]),
      unknownLocationItems: jest.fn().mockResolvedValue([fakeItem({ location: null, locationId: null })]),
      ownershipBreakdown: jest.fn().mockResolvedValue(OWNERSHIP),
      lowStock: jest.fn().mockResolvedValue([fakeItem({ quantityAvailable: 1, minimumStock: 3 })]),
      warrantyItems: jest.fn().mockResolvedValue([
        fakeItem({ warrantyExpiry: new Date('2020-01-01') }),
      ]),
      maintenanceDueItems: jest.fn().mockResolvedValue([fakeItem({ nextCheckDue: new Date('2020-01-01') })]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: ReportsRepository, useValue: repoMock }],
    }).compile();

    service = moduleRef.get(ReportsService);
    repo = moduleRef.get(ReportsRepository);
  });

  it('renders the inventory summary text', async () => {
    const text = await service.text('inventory');
    expect(repo.summary).toHaveBeenCalled();
    expect(text).toContain('ASE Inventory Summary');
    expect(text).toContain('Total item types: 86');
    expect(text).toContain('Low-stock items: 5');
  });

  it('renders borrowed items with borrower and date', async () => {
    const text = await service.text('borrowed');
    expect(text).toContain('Currently Borrowed Items (1)');
    expect(text).toContain('HDMI Cable x1');
    expect(text).toContain('Borrower: Farhan');
    expect(text).toContain('Borrowed At: 2026-06-20');
  });

  it('shows an empty-state message when a list report has no rows', async () => {
    const text = await service.text('lost');
    expect(text).toContain('Lost / Missing Items');
    expect(text).toContain('No lost or missing items');
  });

  it('adds the low-stock extra line', async () => {
    const text = await service.text('low_stock');
    expect(text).toContain('Stock: 1 / min 3');
  });

  it('flags expired warranties', async () => {
    const text = await service.text('warranty');
    expect(text).toContain('Warranty: 2020-01-01 (EXPIRED)');
  });

  it('renders the ownership breakdown with a total', async () => {
    const text = await service.text('ownership');
    expect(text).toContain('Lab Purchase: 60');
    expect(text).toContain('Personal Loan: 5');
    expect(text).toContain('Total active items: 86');
  });

  it('produces a CSV export with a dated filename and header row', async () => {
    const { filename, content } = await service.csv('inventory');
    expect(filename).toMatch(/^report_inventory_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(content.split('\r\n')[0]).toBe('Metric,Value');
    expect(content).toContain('Total item types,86');
  });

  it('produces an item CSV for list reports with the standard header', async () => {
    const { content } = await service.csv('damaged');
    expect(content.split('\r\n')[0]).toContain('Code,Name,Category');
    expect(content).toContain('ASE-CABL-001');
  });

  it('escapes CSV fields that contain commas', async () => {
    repo.unknownLocationItems.mockResolvedValueOnce([fakeItem({ name: 'Cable, long' })]);
    const { content } = await service.csv('unknown_location');
    expect(content).toContain('"Cable, long"');
  });

  it('supports every declared report kind for both text and csv', async () => {
    for (const kind of REPORT_KINDS) {
      await expect(service.text(kind)).resolves.toEqual(expect.any(String));
      await expect(service.csv(kind)).resolves.toEqual(
        expect.objectContaining({ filename: expect.any(String), content: expect.any(String) }),
      );
    }
  });
});
