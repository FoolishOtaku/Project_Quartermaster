import { Prisma, ReturnCondition } from '@prisma/client';

export const borrowInclude = {
  borrower: true,
  item: true,
  itemUnit: true,
} satisfies Prisma.BorrowRecordInclude;

export type BorrowWithRelations = Prisma.BorrowRecordGetPayload<{
  include: typeof borrowInclude;
}>;

export interface BorrowQuantityInput {
  itemId: string;
  borrowerId: string;
  borrowerName: string;
  quantity: number;
  purpose?: string | null;
  dueDate?: Date | null;
}

export interface BorrowUnitInput {
  itemId: string;
  itemUnitId: string;
  borrowerId: string;
  borrowerName: string;
  purpose?: string | null;
  dueDate?: Date | null;
}

export interface ReturnInput {
  recordId: string;
  returnCondition?: ReturnCondition | null;
}
