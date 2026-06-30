import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import {
  borrowedToCsv,
  formatBorrowed,
  formatInventorySummary,
  formatItemList,
  formatOwnership,
  itemsToCsv,
  lowStockExtra,
  maintenanceExtra,
  ownershipToCsv,
  summaryToCsv,
  warrantyExtra,
} from './reports.presenter';
import { CsvExport, REPORT_META, ReportKind, WARRANTY_SOON_DAYS } from './reports.types';

@Injectable()
export class ReportsService {
  constructor(private readonly repository: ReportsRepository) {}

  /** Build the text body for a report. */
  async text(kind: ReportKind): Promise<string> {
    switch (kind) {
      case 'inventory':
        return formatInventorySummary(await this.repository.summary());
      case 'borrowed':
        return formatBorrowed(await this.repository.borrowedActive());
      case 'damaged':
        return formatItemList(
          'Damaged Items',
          await this.repository.damagedItems(),
          'No damaged items. 🎉',
        );
      case 'lost':
        return formatItemList(
          'Lost / Missing Items',
          await this.repository.lostItems(),
          'No lost or missing items. 🎉',
        );
      case 'unknown_location':
        return formatItemList(
          'Unknown Location Items',
          await this.repository.unknownLocationItems(),
          'Every item has a recorded location. 🎉',
        );
      case 'ownership':
        return formatOwnership(await this.repository.ownershipBreakdown());
      case 'low_stock':
        return formatItemList(
          'Low Stock Items',
          await this.repository.lowStock(),
          'No items are below their minimum stock. 🎉',
          lowStockExtra,
        );
      case 'warranty':
        return formatItemList(
          'Warranty Expiry',
          await this.repository.warrantyItems(WARRANTY_SOON_DAYS),
          `No warranties expired or expiring within ${WARRANTY_SOON_DAYS} days.`,
          warrantyExtra,
        );
      case 'maintenance_due':
        return formatItemList(
          'Maintenance Due',
          await this.repository.maintenanceDueItems(),
          'No scheduled checks are due. 🎉',
          maintenanceExtra,
        );
    }
  }

  /** Build a CSV export for a report. */
  async csv(kind: ReportKind): Promise<CsvExport> {
    const filename = `report_${kind}_${new Date().toISOString().slice(0, 10)}.csv`;
    const content = await this.csvContent(kind);
    return { filename, content };
  }

  private async csvContent(kind: ReportKind): Promise<string> {
    switch (kind) {
      case 'inventory':
        return summaryToCsv(await this.repository.summary());
      case 'borrowed':
        return borrowedToCsv(await this.repository.borrowedActive());
      case 'damaged':
        return itemsToCsv(await this.repository.damagedItems());
      case 'lost':
        return itemsToCsv(await this.repository.lostItems());
      case 'unknown_location':
        return itemsToCsv(await this.repository.unknownLocationItems());
      case 'ownership':
        return ownershipToCsv(await this.repository.ownershipBreakdown());
      case 'low_stock':
        return itemsToCsv(await this.repository.lowStock());
      case 'warranty':
        return itemsToCsv(await this.repository.warrantyItems(WARRANTY_SOON_DAYS));
      case 'maintenance_due':
        return itemsToCsv(await this.repository.maintenanceDueItems());
    }
  }

  /** Title for a report kind (used in message headers / captions). */
  title(kind: ReportKind): string {
    return REPORT_META[kind].label;
  }
}
