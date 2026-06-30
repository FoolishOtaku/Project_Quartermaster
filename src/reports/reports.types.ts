import { OwnerSource } from '@prisma/client';

/**
 * The report kinds supported in v0.5.0. The first six are the roadmap's
 * core set (Design.md §29); the last three are the high-value reports the
 * existing schema already supports (Design.md §18.7–18.9).
 */
export type ReportKind =
  | 'inventory'
  | 'borrowed'
  | 'damaged'
  | 'lost'
  | 'unknown_location'
  | 'ownership'
  | 'low_stock'
  | 'warranty'
  | 'maintenance_due';

export const REPORT_KINDS: ReportKind[] = [
  'inventory',
  'borrowed',
  'damaged',
  'lost',
  'unknown_location',
  'ownership',
  'low_stock',
  'warranty',
  'maintenance_due',
];

/** Human labels + short descriptions for the report list / menu. */
export const REPORT_META: Record<ReportKind, { label: string; description: string }> = {
  inventory: { label: 'Inventory Summary', description: 'Totals and a health snapshot' },
  borrowed: { label: 'Borrowed Items', description: 'Everything currently out on loan' },
  damaged: { label: 'Damaged Items', description: 'Needs repair, broken, or in maintenance' },
  lost: { label: 'Lost Items', description: 'Lost or missing items' },
  unknown_location: { label: 'Unknown Location', description: 'Items with no recorded location' },
  ownership: { label: 'Ownership', description: 'Breakdown by owner / source' },
  low_stock: { label: 'Low Stock', description: 'At or below minimum stock' },
  warranty: { label: 'Warranty Expiry', description: 'Warranty expired or expiring soon' },
  maintenance_due: { label: 'Maintenance Due', description: 'Scheduled check is due or overdue' },
};

export function isReportKind(value: string): value is ReportKind {
  return (REPORT_KINDS as string[]).includes(value);
}

/** Aggregated counts for the inventory summary report (§18.2). */
export interface InventorySummary {
  totalItemTypes: number;
  bulkConsumableItems: number;
  individualAssetItems: number;
  totalUnitTrackedAssets: number;
  availableItems: number;
  currentlyBorrowed: number;
  damagedItems: number;
  lostItems: number;
  unknownLocation: number;
  memberOwnedItems: number;
  lowStockItems: number;
}

/** Ownership breakdown for the ownership report (§18.6). */
export type OwnershipBreakdown = Record<OwnerSource, number>;

/** Days-ahead window for "expiring soon" / "due soon" style reports. */
export const WARRANTY_SOON_DAYS = 30;

/** A generated CSV payload ready to send as a Telegram document. */
export interface CsvExport {
  filename: string;
  content: string;
}
