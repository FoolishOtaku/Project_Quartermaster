# Project Quartermaster — Requirements (v0.2.0)

This document defines the scope and acceptance criteria for **Version 0.2.0 —
Inventory MVP**, building on the v0.1.0 Bot Foundation. It is derived from
`Design.md` (Sections 16, 29, and 33).

---

## 1. Release goal

Let authorized members create and maintain quantity-based inventory, and let any
registered member search and view items — all stored in PostgreSQL.

---

## 2. In scope (v0.2.0)

- `Category` and `Location` models (seeded from the spreadsheet Lookup Lists).
- Quantity-based `Item` model (`BULK_STOCK` and `CONSUMABLE` tracking types).
- Automatic item-code generation (`ASE-<PREFIX>-NNN`).
- Bot commands: `/add_item`, `/search_item`, `/view_item`, `/update_item`,
  `/archive_item`.
- Multi-step conversation flows for add/update/archive (in-memory state).
- Role-gated writes (add/update = admin or assistant; archive = admin).
- Low-stock indicator in search/detail output.
- Unit tests for item-code generation and inventory service logic.

## 3. Out of scope (deferred)

- Unit-based assets / `ItemUnit` and per-unit codes (v0.3.0).
- Borrowing / returning and `quantityAvailable` decrements via borrow (v0.4.0).
- Reports and CSV export (v0.5.0).
- Audit logging (v0.6.0).
- AI assistant (v0.7.0+).
- Editing categories/locations from the bot, image upload, barcode/QR.

---

## 4. Functional requirements

| ID    | Requirement                                                                                   | Priority |
| ----- | --------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Categories and locations are seeded and stored in the database.                               | Must     |
| FR-2  | `/add_item` walks an admin/assistant through a guided flow and creates an item.               | Must     |
| FR-3  | Item codes are generated automatically as `ASE-<PREFIX>-NNN` and are unique.                   | Must     |
| FR-4  | A new item's `quantityAvailable` equals its `quantity`.                                        | Must     |
| FR-5  | Only `BULK_STOCK` and `CONSUMABLE` tracking types are accepted this version.                   | Must     |
| FR-6  | `/search_item <keyword>` matches name, code, category, or location; excludes archived items.   | Must     |
| FR-7  | `/view_item <code>` shows full item detail.                                                    | Must     |
| FR-8  | `/update_item [code]` lets an admin/assistant change a chosen field.                           | Must     |
| FR-9  | `/archive_item [code]` lets an admin archive (soft-delete) an item after confirmation.         | Must     |
| FR-10 | Search and view are available to any registered user; writes are role-gated.                   | Must     |
| FR-11 | A user can abort any multi-step flow with `/cancel`.                                            | Should   |
| FR-12 | Items at or below minimum stock are flagged as low stock in output.                            | Should   |

---

## 5. Non-functional requirements

| ID     | Requirement                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| NFR-1  | Conversation state is in-memory, keyed by Telegram user id (Design §20).          |
| NFR-2  | Validation rejects empty names, negative quantities, and bad minimum stock.       |
| NFR-3  | Item codes remain unique; generation checks existing codes for the prefix.         |
| NFR-4  | Bot replies for user-generated item data are sent as plain text (no markdown).    |
| NFR-5  | Categories/locations are soft-deletable (`isArchived`), never hard-deleted.        |
| NFR-6  | Core logic (code generation, inventory service) is covered by unit tests.          |

---

## 6. Data model additions

`Category`, `Location`, and `Item` (with enums `TrackingType`, `ItemCondition`,
`AvailabilityStatus`, `OwnerSource`). See `prisma/schema.prisma` and
`Design.md` Section 14.

> v0.2.0 stores `Item.quantity` (total) and `Item.quantityAvailable`
> (system-maintained). Until borrowing exists (v0.4.0), available tracks total.

---

## 7. Commands and access

| Command         | Access              | Behavior                                              |
| --------------- | ------------------- | ----------------------------------------------------- |
| `/search_item`  | Any registered user | Search items by keyword.                              |
| `/view_item`    | Any registered user | Show full item detail by code.                        |
| `/add_item`     | Admin, Assistant    | Guided create flow.                                   |
| `/update_item`  | Admin, Assistant    | Guided update of one field.                           |
| `/archive_item` | Admin               | Confirm, then soft-delete.                            |

---

## 8. Acceptance criteria

Maps to Design.md §29 (v0.2.0 success criteria):

1. `npm install`, `npm run prisma:generate`, and `npm run build` succeed.
2. `npm test` passes.
3. `npm run prisma:migrate` applies the new tables; `npm run db:seed` seeds the
   admin plus all categories and locations.
4. An admin or assistant can create an item via `/add_item`; it persists with a
   generated code.
5. Any registered user can `/search_item` and `/view_item`.
6. A trusted member or viewer is refused `/add_item`, `/update_item`, and
   `/archive_item`.
7. `/archive_item` removes an item from default search results.

---

## 9. Verification checklist

- [ ] Build succeeds (`npm run build`).
- [ ] Unit tests pass (`npm test`).
- [ ] Migration applied; `categories`, `locations`, `items` tables exist.
- [ ] Seed created categories and locations.
- [ ] `/add_item` creates an item with a generated `ASE-...` code.
- [ ] `/search_item` and `/view_item` work for a viewer.
- [ ] Writes are refused for non-admin/assistant roles.
- [ ] `/archive_item` hides the item from search.
