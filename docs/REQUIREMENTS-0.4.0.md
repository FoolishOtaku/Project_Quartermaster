# Project Quartermaster — Requirements (v0.4.0)

Scope and acceptance criteria for **Version 0.4.0 — Borrowing System**, building
on the v0.2.x/0.3.0 inventory. Derived from `Design.md` (Sections 14.6, 17, 21.3, 29).

---

## 1. Release goal

Let members borrow and return lab items — both quantity-based stock and
individual asset units — with availability kept accurate and a permanent borrow
history.

---

## 2. In scope (v0.4.0)

- `BorrowRecord` model + `BorrowStatus` / `ReturnCondition` enums.
- Commands: `/borrow_item`, `/return_item`, `/who_has`, `/my_borrowed`.
- Borrowing a quantity from bulk/consumable items.
- Borrowing a specific unit of an individual-asset item.
- Returning, with per-unit return condition (Good / Damaged / Needs Repair / Missing).
- Transactional availability updates (no oversell / double-borrow under concurrency).
- Borrow history preserved (records are never deleted).
- Role-gated borrow/return; view commands open to any registered user.
- Unit tests for borrowing service logic.

## 3. Out of scope (deferred)

- Borrowing on behalf of external (non-registered) people via the bot
  (schema supports it; the bot borrows as the requesting user).
- Approval workflow / `approvedBy` capture (field exists; unused by the bot).
- Overdue reminders/notifications (v0.5.0+).
- Reports across borrow history (v0.5.0).

---

## 4. Functional requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | `/borrow_item <code>` borrows a quantity (bulk) or a chosen unit (individual asset).          | Must     |
| FR-2  | A quantity borrow cannot exceed the item's current available quantity.                        | Must     |
| FR-3  | A unit borrow is rejected if the chosen unit is not AVAILABLE.                                 | Must     |
| FR-4  | Borrowing decrements availability atomically (transaction), re-checked inside the tx.         | Must     |
| FR-5  | `/return_item` lists the caller's active borrows and returns the chosen one.                  | Must     |
| FR-6  | Returning a unit records its condition; Damaged/Needs-Repair → Maintenance, Missing → Lost.   | Must     |
| FR-7  | Returning restores availability (units recompute; quantities increment).                      | Must     |
| FR-8  | `/who_has <code>` shows who is currently borrowing an item.                                    | Must     |
| FR-9  | `/my_borrowed` shows the caller's current borrows.                                             | Must     |
| FR-10 | Borrow records are never deleted; returning sets `returnedAt` + `status`.                      | Must     |
| FR-11 | Borrow/return require a non-VIEWER role; view commands allow any registered user.              | Must     |

---

## 5. Non-functional requirements

| ID     | Requirement                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| NFR-1  | Borrow/return run in Prisma interactive transactions to prevent race conditions.   |
| NFR-2  | Unit borrow/return recompute item counts from active units (no drift).             |
| NFR-3  | Selections (unit, return condition, confirm) use inline buttons; typing fallback.  |
| NFR-4  | Borrowing service logic is covered by unit tests; transactions verified against DB.|

---

## 6. Data model addition

```prisma
model BorrowRecord {
  id              String   @id @default(uuid())
  borrower        User?    @relation("Borrower", fields: [borrowerId], references: [id])
  borrowerId      String?
  borrowerName    String
  borrowerContact String?
  item            Item     @relation(fields: [itemId], references: [id])
  itemId          String
  itemUnit        ItemUnit? @relation(fields: [itemUnitId], references: [id])
  itemUnitId      String?
  quantity        Int?
  borrowedAt      DateTime @default(now())
  dueDate         DateTime?
  returnedAt      DateTime?
  returnCondition ReturnCondition?
  approvedBy      User?    @relation("Approver", fields: [approvedById], references: [id])
  approvedById    String?
  purpose         String?
  notes           String?
  status          BorrowStatus @default(BORROWED)
}
enum BorrowStatus { BORROWED RETURNED OVERDUE DAMAGED LOST }
enum ReturnCondition { SAME_AS_BORROWED GOOD DAMAGED MISSING NEEDS_REPAIR }
```

Migration: `add_borrow_record` (creates `borrow_records`; relations on
`User`, `Item`, `ItemUnit`).

---

## 7. Commands and access

| Command               | Access                                   | Behavior                                   |
| --------------------- | ---------------------------------------- | ------------------------------------------ |
| `/borrow_item [code]` | Admin, Coordinator, Assistant, Trusted   | Guided borrow (unit picker or quantity).   |
| `/return_item`        | Admin, Coordinator, Assistant, Trusted   | Pick from active borrows; return.          |
| `/who_has <code>`     | Any registered user                      | Active borrowers of an item.               |
| `/my_borrowed`        | Any registered user                      | Caller's current borrows.                  |

---

## 8. Acceptance criteria

Maps to Design.md §29 (v0.4.0 success criteria):

1. `npm run build` and `npm test` pass.
2. `npm run prisma:migrate` adds the `borrow_records` table.
3. A user can borrow an available item/unit and the availability drops.
4. The system prevents borrowing beyond availability / an unavailable unit.
5. The user can return it and availability is restored (condition applied for units).
6. `/who_has` and `/my_borrowed` reflect the current state.
7. Borrow history is preserved after return.

---

## 9. Verification checklist

- [ ] Build succeeds (`npm run build`).
- [ ] Unit tests pass (`npm test`).
- [ ] `borrow_records` table exists after migration.
- [ ] Borrow unit → unit BORROWED, item available −1 (verified against DB).
- [ ] Return unit (Good) → unit AVAILABLE, item available +1, status RETURNED (verified against DB).
- [ ] Over-quantity / unavailable-unit borrow is refused.
- [ ] `/my_borrowed` and `/who_has` show correct active records.
- [ ] Borrow/return refused for the VIEWER role.
