import { BorrowWithRelations } from './borrowing.types';

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toISOString().slice(0, 10);
}

/** One-line label for a borrow record. */
export function borrowLabel(record: BorrowWithRelations): string {
  if (record.itemUnit) {
    return `${record.item.name} — ${record.itemUnit.unitCode}`;
  }
  return `${record.item.name} x${record.quantity ?? 1}`;
}

/** /my_borrowed — the caller's active borrows. */
export function formatMyBorrowed(records: BorrowWithRelations[]): string {
  if (records.length === 0) {
    return 'You have no items currently borrowed.';
  }
  const body = records
    .map((r, i) => {
      const due = r.dueDate ? `\n   Due: ${fmtDate(r.dueDate)}` : '';
      const purpose = r.purpose ? `\n   Purpose: ${r.purpose}` : '';
      return `${i + 1}. ${borrowLabel(r)}\n   Borrowed: ${fmtDate(r.borrowedAt)}${due}${purpose}`;
    })
    .join('\n\n');
  return `Your borrowed items (${records.length}):\n\n${body}`;
}

/** /who_has — who currently holds an item. */
export function formatWhoHas(itemName: string, records: BorrowWithRelations[]): string {
  if (records.length === 0) {
    return `Nobody is currently borrowing "${itemName}".`;
  }
  const body = records
    .map((r, i) => {
      const what = r.itemUnit ? ` (${r.itemUnit.unitCode})` : ` x${r.quantity ?? 1}`;
      const due = r.dueDate ? `, due ${fmtDate(r.dueDate)}` : '';
      return `${i + 1}. ${r.borrowerName}${what} — since ${fmtDate(r.borrowedAt)}${due}`;
    })
    .join('\n');
  return `Currently borrowed — ${itemName}:\n\n${body}`;
}

/** Confirmation after a successful borrow. */
export function formatBorrowConfirmation(record: BorrowWithRelations): string {
  return [
    '✅ Borrow recorded.',
    '',
    `Item: ${record.item.name}`,
    record.itemUnit ? `Unit: ${record.itemUnit.unitCode}` : `Quantity: ${record.quantity ?? 1}`,
    `Borrower: ${record.borrowerName}`,
    record.dueDate ? `Due: ${fmtDate(record.dueDate)}` : null,
    record.purpose ? `Purpose: ${record.purpose}` : null,
    'Status: Borrowed',
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}

/** Confirmation after a return. */
export function formatReturnConfirmation(record: BorrowWithRelations): string {
  return [
    '✅ Return recorded.',
    '',
    `Item: ${record.item.name}`,
    record.itemUnit ? `Unit: ${record.itemUnit.unitCode}` : `Quantity: ${record.quantity ?? 1}`,
    `Status: ${record.status}`,
    record.returnCondition ? `Return condition: ${record.returnCondition}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}
