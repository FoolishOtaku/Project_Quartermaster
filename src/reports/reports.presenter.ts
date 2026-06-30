import { OwnerSource } from '@prisma/client';
import { ItemWithRelations } from '../inventory/inventory.types';
import { BorrowWithRelations } from '../borrowing/borrowing.types';
import {
  AVAILABILITY_LABELS,
  CONDITION_LABELS,
  OWNER_SOURCE_LABELS,
} from '../inventory/inventory.presenter';
import { InventorySummary, OwnershipBreakdown } from './reports.types';

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toISOString().slice(0, 10);
}

// ---- CSV helpers -----------------------------------------------------------

/** Escape one CSV field per RFC 4180 (quote when it contains , " or newline). */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: (unknown[])[]): string {
  const lines = [headers.map(csvField).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvField).join(','));
  }
  // CRLF line endings + trailing newline — friendliest for Excel.
  return lines.join('\r\n') + '\r\n';
}

// ---- Text reports ----------------------------------------------------------

export function formatInventorySummary(s: InventorySummary): string {
  return [
    'ASE Inventory Summary',
    '',
    `Total item types: ${s.totalItemTypes}`,
    `Bulk / consumable items: ${s.bulkConsumableItems}`,
    `Individual-asset items: ${s.individualAssetItems}`,
    `Total unit-tracked assets: ${s.totalUnitTrackedAssets}`,
    '',
    `Available items: ${s.availableItems}`,
    `Currently borrowed (records): ${s.currentlyBorrowed}`,
    `Damaged items: ${s.damagedItems}`,
    `Lost items: ${s.lostItems}`,
    `Unknown location: ${s.unknownLocation}`,
    `Member-owned items in lab: ${s.memberOwnedItems}`,
    `Low-stock items: ${s.lowStockItems}`,
  ].join('\n');
}

export function formatBorrowed(records: BorrowWithRelations[]): string {
  if (records.length === 0) {
    return 'Currently Borrowed Items\n\nNothing is out on loan right now.';
  }
  const body = records
    .map((r, i) => {
      const what = r.itemUnit ? r.itemUnit.unitCode : `x${r.quantity ?? 1}`;
      const lines = [
        `${i + 1}. ${r.item.name} ${what}`,
        `   Borrower: ${r.borrowerName}`,
        `   Borrowed At: ${fmtDate(r.borrowedAt)}`,
      ];
      if (r.dueDate) lines.push(`   Due: ${fmtDate(r.dueDate)}`);
      if (r.purpose) lines.push(`   Purpose: ${r.purpose}`);
      return lines.join('\n');
    })
    .join('\n\n');
  return `Currently Borrowed Items (${records.length})\n\n${body}`;
}

/** Generic numbered item list with an optional per-item extra line. */
export function formatItemList(
  title: string,
  items: ItemWithRelations[],
  emptyMessage: string,
  extra?: (item: ItemWithRelations) => string | null,
): string {
  if (items.length === 0) {
    return `${title}\n\n${emptyMessage}`;
  }
  const body = items
    .map((item, i) => {
      const lines = [
        `${i + 1}. ${item.name}`,
        `   Code: ${item.code}`,
        `   Category: ${item.category.name}`,
        `   Location: ${item.location?.name ?? 'Unknown'}`,
        `   Condition: ${CONDITION_LABELS[item.condition]}`,
        `   Availability: ${AVAILABILITY_LABELS[item.availabilityStatus]}`,
      ];
      const e = extra?.(item);
      if (e) lines.push(`   ${e}`);
      return lines.join('\n');
    })
    .join('\n\n');
  return `${title} (${items.length})\n\n${body}`;
}

export function lowStockExtra(item: ItemWithRelations): string {
  return `Stock: ${item.quantityAvailable ?? item.quantity ?? 0} / min ${item.minimumStock ?? 0}`;
}

export function warrantyExtra(item: ItemWithRelations): string {
  const expired = item.warrantyExpiry ? new Date(item.warrantyExpiry) < new Date() : false;
  return `Warranty: ${fmtDate(item.warrantyExpiry)}${expired ? ' (EXPIRED)' : ' (expiring soon)'}`;
}

export function maintenanceExtra(item: ItemWithRelations): string {
  return `Next check due: ${fmtDate(item.nextCheckDue)}`;
}

export function formatOwnership(b: OwnershipBreakdown): string {
  const order: OwnerSource[] = [
    'LAB_PURCHASE',
    'UNIVERSITY_ASSET',
    'DONATION',
    'PERSONAL_LOAN',
    'UNKNOWN',
  ];
  const total = order.reduce((sum, k) => sum + b[k], 0);
  const lines = order.map((k) => `${OWNER_SOURCE_LABELS[k]}: ${b[k]}`);
  return ['Ownership Breakdown', '', ...lines, '', `Total active items: ${total}`].join('\n');
}

// ---- CSV reports -----------------------------------------------------------

const ITEM_CSV_HEADERS = [
  'Code',
  'Name',
  'Category',
  'Tracking Type',
  'Quantity',
  'Available',
  'Minimum Stock',
  'Condition',
  'Availability',
  'Location',
  'Owner / Source',
  'Warranty Expiry',
  'Next Check Due',
];

function itemRow(item: ItemWithRelations): unknown[] {
  return [
    item.code,
    item.name,
    item.category.name,
    item.trackingType,
    item.quantity ?? '',
    item.quantityAvailable ?? '',
    item.minimumStock ?? '',
    CONDITION_LABELS[item.condition],
    AVAILABILITY_LABELS[item.availabilityStatus],
    item.location?.name ?? '',
    OWNER_SOURCE_LABELS[item.ownerSource],
    fmtDate(item.warrantyExpiry),
    fmtDate(item.nextCheckDue),
  ];
}

export function itemsToCsv(items: ItemWithRelations[]): string {
  return toCsv(ITEM_CSV_HEADERS, items.map(itemRow));
}

export function borrowedToCsv(records: BorrowWithRelations[]): string {
  const headers = ['Item Code', 'Item', 'Unit', 'Quantity', 'Borrower', 'Borrowed At', 'Due', 'Purpose', 'Status'];
  const rows = records.map((r) => [
    r.item.code,
    r.item.name,
    r.itemUnit?.unitCode ?? '',
    r.quantity ?? 1,
    r.borrowerName,
    fmtDate(r.borrowedAt),
    fmtDate(r.dueDate),
    r.purpose ?? '',
    r.status,
  ]);
  return toCsv(headers, rows);
}

export function summaryToCsv(s: InventorySummary): string {
  const headers = ['Metric', 'Value'];
  const rows: [string, number][] = [
    ['Total item types', s.totalItemTypes],
    ['Bulk / consumable items', s.bulkConsumableItems],
    ['Individual-asset items', s.individualAssetItems],
    ['Total unit-tracked assets', s.totalUnitTrackedAssets],
    ['Available items', s.availableItems],
    ['Currently borrowed (records)', s.currentlyBorrowed],
    ['Damaged items', s.damagedItems],
    ['Lost items', s.lostItems],
    ['Unknown location', s.unknownLocation],
    ['Member-owned items in lab', s.memberOwnedItems],
    ['Low-stock items', s.lowStockItems],
  ];
  return toCsv(headers, rows);
}

export function ownershipToCsv(b: OwnershipBreakdown): string {
  const headers = ['Owner / Source', 'Count'];
  const order: OwnerSource[] = [
    'LAB_PURCHASE',
    'UNIVERSITY_ASSET',
    'DONATION',
    'PERSONAL_LOAN',
    'UNKNOWN',
  ];
  return toCsv(headers, order.map((k) => [OWNER_SOURCE_LABELS[k], b[k]]));
}
