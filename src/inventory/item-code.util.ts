/**
 * Item code generation helpers.
 *
 * Codes follow the spreadsheet convention `ASE-<PREFIX>-<NNN>`, e.g. ASE-CAB-001.
 * The prefix is derived from the category name; the sequence is the next free
 * number among existing codes that share the prefix.
 */

export const ITEM_CODE_ROOT = 'ASE';

/** Derive a short uppercase alphanumeric prefix from a category name. */
export function categoryPrefix(categoryName: string): string {
  const cleaned = categoryName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  return cleaned.length > 0 ? cleaned : 'ITM';
}

/** Build the literal prefix portion, e.g. "ASE-CAB-". */
export function codePrefix(categoryName: string): string {
  return `${ITEM_CODE_ROOT}-${categoryPrefix(categoryName)}-`;
}

/**
 * Given the existing codes that share a prefix, compute the next code.
 * Sequence numbers are zero-padded to at least 3 digits.
 */
export function nextItemCode(
  categoryName: string,
  existingCodes: string[],
): string {
  const prefix = codePrefix(categoryName);
  let max = 0;

  for (const code of existingCodes) {
    if (!code.startsWith(prefix)) {
      continue;
    }
    const suffix = code.slice(prefix.length);
    const n = Number.parseInt(suffix, 10);
    if (Number.isInteger(n) && n > max) {
      max = n;
    }
  }

  const next = max + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/** Literal prefix for a unit code, e.g. "ASE-MON-001-U". */
export function unitCodePrefix(itemCode: string): string {
  return `${itemCode}-U`;
}

/**
 * Next unit code for an item, e.g. ASE-MON-001-U01.
 * Sequence numbers are zero-padded to at least 2 digits.
 */
export function nextUnitCode(itemCode: string, existingUnitCodes: string[]): string {
  const prefix = unitCodePrefix(itemCode);
  let max = 0;

  for (const code of existingUnitCodes) {
    if (!code.startsWith(prefix)) {
      continue;
    }
    const n = Number.parseInt(code.slice(prefix.length), 10);
    if (Number.isInteger(n) && n > max) {
      max = n;
    }
  }

  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}
