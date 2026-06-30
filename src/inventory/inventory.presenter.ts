import {
  AvailabilityStatus,
  ItemCondition,
  OwnerSource,
  TrackingType,
} from '@prisma/client';
import { ItemUnitWithRelations, ItemWithRelations } from './inventory.types';

export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  INDIVIDUAL_ASSET: 'Individual Asset',
  BULK_STOCK: 'Bulk Stock',
  CONSUMABLE: 'Consumable',
};

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  NEW: 'New',
  GOOD: 'Good',
  FAIR: 'Fair',
  NEEDS_REPAIR: 'Needs Repair',
  BROKEN: 'Broken',
  LOST: 'Lost',
  UNKNOWN: 'Unknown',
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'Available',
  IN_USE: 'In Use',
  BORROWED: 'Borrowed',
  MAINTENANCE: 'Maintenance',
  MISSING: 'Missing',
  RETIRED: 'Retired',
  DISPOSED: 'Disposed',
};

export const OWNER_SOURCE_LABELS: Record<OwnerSource, string> = {
  LAB_PURCHASE: 'Lab Purchase',
  UNIVERSITY_ASSET: 'University Asset',
  DONATION: 'Donation',
  PERSONAL_LOAN: 'Personal Loan',
  UNKNOWN: 'Unknown',
};

function lowStockFlag(item: ItemWithRelations): string {
  if (item.quantity == null || item.minimumStock == null) {
    return '';
  }
  return item.quantity <= item.minimumStock ? '  ⚠️ LOW STOCK' : '';
}

/** Full detail view for /view_item. */
export function formatItemDetail(
  item: ItemWithRelations,
  units?: ItemUnitWithRelations[],
): string {
  const isIndividual = item.trackingType === TrackingType.INDIVIDUAL_ASSET;
  const lines: (string | null)[] = [
    'Item Detail',
    '',
    `Code: ${item.code}`,
    `Name: ${item.name}`,
    item.brandModel ? `Brand / Model: ${item.brandModel}` : null,
    `Category: ${item.category.name}`,
    item.subcategory ? `Subcategory: ${item.subcategory}` : null,
    `Tracking Type: ${TRACKING_TYPE_LABELS[item.trackingType]}`,
    isIndividual
      ? `Units: ${item.quantityAvailable ?? 0} available / ${item.quantity ?? 0} total`
      : `Quantity: ${item.quantity ?? 0}${item.unit ? ` ${item.unit}` : ''}`,
    !isIndividual ? `Available: ${item.quantityAvailable ?? 0}` : null,
    !isIndividual && item.minimumStock != null
      ? `Minimum Stock: ${item.minimumStock}${lowStockFlag(item)}`
      : null,
    `Location: ${item.location?.name ?? 'Unknown'}`,
    item.storageDetail ? `Storage Detail: ${item.storageDetail}` : null,
    !isIndividual ? `Condition: ${CONDITION_LABELS[item.condition]}` : null,
    !isIndividual ? `Availability: ${AVAILABILITY_LABELS[item.availabilityStatus]}` : null,
    `Owner / Source: ${OWNER_SOURCE_LABELS[item.ownerSource]}`,
    item.ownerName ? `Owner Name: ${item.ownerName}` : null,
    item.responsiblePic ? `Responsible PIC: ${item.responsiblePic}` : null,
    item.notes ? `Notes: ${item.notes}` : null,
    item.isArchived ? '\n(Archived)' : null,
  ];

  let result = lines.filter((l): l is string => l !== null).join('\n');

  if (isIndividual && units) {
    if (units.length === 0) {
      result += '\n\nUnits: none yet. Add one with /add_unit ' + item.code;
    } else {
      const unitLines = units
        .map(
          (u) =>
            `• ${u.unitCode} — ${CONDITION_LABELS[u.condition]}, ${AVAILABILITY_LABELS[u.availabilityStatus]}` +
            (u.location ? ` @ ${u.location.name}` : ''),
        )
        .join('\n');
      result += `\n\nUnits (${units.length}):\n${unitLines}`;
    }
  }

  return result;
}

/** Detail view for a single physical unit (/view_unit). */
export function formatUnitDetail(unit: ItemUnitWithRelations): string {
  const lines: (string | null)[] = [
    'Unit Detail',
    '',
    `Unit Code: ${unit.unitCode}`,
    `Item: ${unit.item.name} (${unit.item.code})`,
    unit.serialNumber ? `Serial Number: ${unit.serialNumber}` : null,
    unit.brandModel ? `Brand / Model: ${unit.brandModel}` : null,
    unit.specs ? `Specs: ${unit.specs}` : null,
    `Condition: ${CONDITION_LABELS[unit.condition]}`,
    `Availability: ${AVAILABILITY_LABELS[unit.availabilityStatus]}`,
    `Location: ${unit.location?.name ?? 'Unknown'}`,
    unit.storageDetail ? `Storage Detail: ${unit.storageDetail}` : null,
    unit.notes ? `Notes: ${unit.notes}` : null,
    unit.isArchived ? '\n(Archived)' : null,
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}

/** Compact list for /search_item results. */
export function formatSearchResults(
  query: string,
  items: ItemWithRelations[],
): string {
  if (items.length === 0) {
    return `No items found for "${query}". Try another keyword.`;
  }

  const header = `Found ${items.length} item(s) for "${query}":\n`;
  const body = items
    .map((item, index) => {
      const qty = `${item.quantityAvailable ?? 0} / ${item.quantity ?? 0}`;
      return [
        `${index + 1}. ${item.name}${lowStockFlag(item)}`,
        `   Code: ${item.code}`,
        `   Available: ${qty}`,
        `   Location: ${item.location?.name ?? 'Unknown'}`,
        `   Condition: ${CONDITION_LABELS[item.condition]}`,
      ].join('\n');
    })
    .join('\n\n');

  return `${header}\n${body}`;
}
