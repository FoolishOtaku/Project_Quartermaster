# Project Quartermaster — Requirements (v0.3.0)

Scope and acceptance criteria for **Version 0.3.0 — Individual-Asset
Inventory**, building on the v0.2.x Inventory MVP. Derived from `Design.md`
(Sections 9, 14.5, 29).

---

## 1. Release goal

Track unique, valuable assets (monitors, PCs, routers, …) **individually** —
each physical unit has its own code, condition, location, and availability —
while the parent item aggregates them.

---

## 2. In scope (v0.3.0)

- `ItemUnit` model (one row per physical unit) with relations to `Item` and `Location`.
- `INDIVIDUAL_ASSET` tracking type selectable in `/add_item`.
- Auto-generated unit codes (`<itemCode>-U<NN>`, e.g. `ASE-MON-001-U01`).
- Per-unit condition, location, availability, serial number, storage detail, notes.
- Unit commands: `/add_unit`, `/view_unit`, `/update_unit`, `/archive_unit`.
- `/view_item` lists the units of an individual-asset item.
- Parent item `quantity` / `quantityAvailable` kept in sync with its active units.
- Unit tests for unit-code generation and unit service logic.

## 3. Out of scope (deferred)

- Borrowing/returning units (v0.4.0).
- Reports across units (v0.5.0).
- Maintenance log per unit (v0.6.0).
- AI assistant (v0.7.0+).

---

## 4. Functional requirements

| ID    | Requirement                                                                                | Priority |
| ----- | ------------------------------------------------------------------------------------------ | -------- |
| FR-1  | `/add_item` offers Individual Asset; it creates an item with 0 units.                       | Must     |
| FR-2  | `/add_unit <itemCode>` adds a physical unit to an individual-asset item.                    | Must     |
| FR-3  | Unit codes are auto-generated as `<itemCode>-U<NN>` and unique.                             | Must     |
| FR-4  | A unit carries its own condition, availability, location, serial number, storage, notes.    | Must     |
| FR-5  | Adding/archiving a unit recomputes the item's total and available counts.                   | Must     |
| FR-6  | `/update_unit <unitCode>` changes a unit's condition/availability/location/storage/notes.   | Must     |
| FR-7  | Changing a unit's availability recomputes the parent item's available count.                | Must     |
| FR-8  | `/archive_unit <unitCode>` soft-deletes a unit (admin only).                                | Must     |
| FR-9  | `/view_item` shows the unit list for individual-asset items; `/view_unit` shows one unit.   | Must     |
| FR-10 | `/update_item` refuses to set quantity on individual-asset items.                           | Should   |
| FR-11 | Units can only be added to individual-asset items.                                          | Must     |

---

## 5. Non-functional requirements

| ID     | Requirement                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| NFR-1  | Unit selections (condition, availability, location) use inline buttons; typing works as fallback. |
| NFR-2  | Item/unit counts are derived from active (non-archived) units, never drift.        |
| NFR-3  | Unit operations are role-gated (add/update = admin/assistant; archive = admin).    |
| NFR-4  | Unit-code generation and unit service logic are covered by unit tests.             |

---

## 6. Data model addition

```prisma
model ItemUnit {
  id                 String   @id @default(uuid())
  item               Item     @relation(fields: [itemId], references: [id])
  itemId             String
  unitCode           String   @unique
  serialNumber       String?
  brandModel         String?
  specs              String?
  condition          ItemCondition      @default(UNKNOWN)
  availabilityStatus AvailabilityStatus @default(AVAILABLE)
  location           Location? @relation(fields: [locationId], references: [id])
  locationId         String?
  storageDetail      String?
  warrantyExpiry     DateTime?
  notes              String?
  isArchived         Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

Migration: `add_item_unit` (creates `item_units`, plus `Item.units` and
`Location.itemUnits` relations).

---

## 7. Commands and access

| Command                   | Access            | Behavior                                        |
| ------------------------- | ----------------- | ----------------------------------------------- |
| `/view_unit <unitCode>`   | Any registered    | Show one physical unit.                          |
| `/add_unit <itemCode>`    | Admin, Assistant  | Guided flow to add a unit to an asset.           |
| `/update_unit <unitCode>` | Admin, Assistant  | Guided flow to change one unit field.            |
| `/archive_unit <unitCode>`| Admin             | Confirm, then soft-delete the unit.              |

---

## 8. Acceptance criteria

Maps to Design.md §29 (v0.3.0 success criteria):

1. `npm run build` and `npm test` pass.
2. `npm run prisma:migrate` adds the `item_units` table.
3. An admin can create an Individual Asset item via `/add_item`.
4. `/add_unit` adds units with generated codes; the item's unit counts update.
5. `/update_unit` changes a unit's condition/availability/location.
6. `/view_item` shows the unit list; `/view_unit` shows a single unit.
7. Non-admin/assistant roles are refused the unit write commands.

---

## 9. Verification checklist

- [ ] Build succeeds (`npm run build`).
- [ ] Unit tests pass (`npm test`).
- [ ] `item_units` table exists after migration.
- [ ] `/add_item` → Individual Asset creates an item with 0 units.
- [ ] `/add_unit` generates `...-U01`, `...-U02`, … and updates counts.
- [ ] `/update_unit` availability change updates the item's available count.
- [ ] `/archive_unit` reduces the item's unit count.
- [ ] Writes refused for viewer/trusted-member roles.
