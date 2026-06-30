# Project Quartermaster — Software Design Document

## 1. Project Overview

**Project Quartermaster** is a Telegram-based inventory management system for the ASE Software Engineering Laboratory at Telkom University.

ASE is a software and game development laboratory/community. The lab room contains many types of items, including computers, monitors, cables, peripherals, sleeping bags, board games, tools, and various miscellaneous items. Currently, there is no structured inventory record. This causes problems such as forgotten item locations, repeated purchases of existing items, unclear borrowing history, and lack of accountability.

Project Quartermaster aims to solve this by providing a lightweight inventory system through a Telegram bot. The bot will allow authorized ASE members to record, search, borrow, return, update, and report inventory items.

The project will start as a command-based Telegram bot and later include AI-powered natural language interaction in Indonesian and English. The AI must never modify the database directly without user confirmation.

---

## 2. Project Goals

### 2.1 Main Goals

1. Create a practical inventory system for ASE Laboratory.
2. Help the logistics assistant manage items, borrowing, item conditions, and reports.
3. Provide a real-world portfolio project demonstrating:
   - Backend development
   - Database design
   - Telegram bot integration
   - Role-based access control
   - Inventory business logic
   - AI integration
   - Deployment and server management
   - Documentation and testing

### 2.2 Portfolio Goals

This project should show that the developer can:

- Design a database-backed backend system.
- Build a bot interface for real users.
- Handle real-world messy data.
- Implement role-based permissions.
- Design safe AI-assisted workflows.
- Write clean documentation.
- Deploy and maintain a server application.

---

## 3. Project Scope

### 3.1 In Scope

The system will support:

- Telegram bot interface
- Manual user registration by admin
- Role-based access
- Inventory item management
- Individual-asset, bulk-stock, and consumable item tracking
- Item categories
- Item locations
- Item ownership information
- Borrowing and returning items
- Borrowing history
- Item condition tracking
- Reports
- CSV or Excel export
- Audit logs
- AI-powered natural language search
- AI-powered action proposal with confirmation
- Deployment to local laptop first, then lab server

### 3.2 Out of Scope for Initial Version

The following should not be implemented in the first version:

- Web dashboard
- Mobile app
- Image upload
- Barcode scanner
- QR code scanner
- Multi-lab support
- Complex approval workflow
- Daily reminder notifications
- Vector database
- Complex analytics dashboard
- Microservice architecture

These may be considered future improvements after the core system is stable.

---

## 4. Target Users

### 4.1 Main Users

| User Type            | Description                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Logistics Assistant  | Main admin and most frequent user. Manages inventory, repair, buying, borrowing, and reports. |
| Coordinator          | Can view inventory and generate reports.                                                      |
| Laboratory Assistant | Can search, borrow, return, and help update item records.                                     |
| Trusted Member       | Can search, borrow, and return items.                                                         |
| Viewer               | Can only view/search inventory.                                                               |

### 4.2 Estimated User Count

The system is designed for a small group of around 10–15 users.

---

## 5. Recommended Tech Stack

### 5.1 Backend

Use:

```txt
NestJS
TypeScript
Prisma ORM
PostgreSQL
Telegraf
```

### 5.2 Database

Recommended database:

```txt
PostgreSQL
```

Alternative:

```txt
MariaDB
```

PostgreSQL is preferred because it is strong for relational data, works well with Prisma, and is commonly used in modern backend systems.

### 5.3 Bot Framework

Use:

```txt
Telegraf
```

Telegraf will handle Telegram bot commands, messages, inline buttons, and callback actions.

### 5.4 AI Provider

The AI layer should be provider-agnostic.

Supported future providers:

```txt
NONE
GEMINI
OPENAI
OLLAMA
```

The first implementation should work without AI.

---

## 6. System Architecture

### 6.1 Architecture Type

Use a **modular monolith**.

Do not use microservices.

The project should be one backend application with multiple internal modules.

### 6.2 High-Level Architecture

```txt
Telegram User
    ↓
Telegram Bot
    ↓
NestJS Application
    ↓
Application Modules
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

### 6.3 Main Modules

```txt
src/
  app.module.ts

  bot/
    bot.module.ts
    bot.update.ts
    bot.service.ts
    bot.keyboard.ts
    bot.messages.ts

  users/
    users.module.ts
    users.service.ts
    users.repository.ts
    users.types.ts

  inventory/
    inventory.module.ts
    inventory.service.ts
    inventory.repository.ts
    inventory.types.ts

  categories/
    categories.module.ts
    categories.service.ts

  locations/
    locations.module.ts
    locations.service.ts

  borrowing/
    borrowing.module.ts
    borrowing.service.ts
    borrowing.repository.ts

  reports/
    reports.module.ts
    reports.service.ts
    report-export.service.ts

  audit/
    audit.module.ts
    audit.service.ts

  ai/
    ai.module.ts
    ai.service.ts
    ai.types.ts
    providers/
      none.provider.ts
      gemini.provider.ts
      openai.provider.ts
      ollama.provider.ts

  common/
    guards/
    decorators/
    filters/
    constants/
    utils/
```

---

## 7. Core Design Principles

### 7.1 Inventory First, AI Second

The system must work properly without AI.

The command-based bot is the foundation. AI is added later as a convenience layer.

### 7.2 Confirmation Before Dangerous Actions

Any AI-generated action that modifies the database must require confirmation.

Example:

```txt
User:
Tambahkan 3 kabel HDMI ke cable box.

Bot:
I understood this action:

Action: Add stock
Item: HDMI Cable
Quantity: +3
Location: Cable Box

Confirm?
[Confirm] [Cancel]
```

The database changes only after the user confirms.

### 7.3 Audit Everything Important

Important actions must be logged.

Examples:

- User registered
- Item created
- Item updated
- Item moved
- Item borrowed
- Item returned
- Item marked damaged
- Report generated
- AI action confirmed
- AI action cancelled

### 7.4 Keep It Small but Serious

Do not add large unnecessary features early.

Prioritize:

1. Data correctness
2. Useful bot commands
3. Borrowing records
4. Reports
5. AI assistant
6. Deployment
7. Documentation

---

## 8. User Roles and Permissions

### 8.1 Role List

```txt
ADMIN
COORDINATOR
ASSISTANT
TRUSTED_MEMBER
VIEWER
```

### 8.2 Permission Matrix

| Feature                      | Admin |           Coordinator |             Assistant |        Trusted Member | Viewer |
| ---------------------------- | ----: | --------------------: | --------------------: | --------------------: | -----: |
| Use `/start`, `/help`, `/me` |   Yes |                   Yes |                   Yes |                   Yes |    Yes |
| Search inventory             |   Yes |                   Yes |                   Yes |                   Yes |    Yes |
| View item detail             |   Yes |                   Yes |                   Yes |                   Yes |    Yes |
| Add item                     |   Yes |                    No |                   Yes |                    No |     No |
| Update item                  |   Yes |                    No |                   Yes |                    No |     No |
| Delete/archive item          |   Yes |                    No |                    No |                    No |     No |
| Move item location           |   Yes |                    No |                   Yes |                    No |     No |
| Borrow item                  |   Yes |                   Yes |                   Yes |                   Yes |     No |
| Return item                  |   Yes |                   Yes |                   Yes |                   Yes |     No |
| Generate reports             |   Yes |                   Yes |                   Yes |                    No |     No |
| Register user                |   Yes |                    No |                    No |                    No |     No |
| Update user role             |   Yes |                    No |                    No |                    No |     No |
| View audit log               |   Yes |                    No |                    No |                    No |     No |
| Use AI read-only assistant   |   Yes |                   Yes |                   Yes |                   Yes |    Yes |
| Confirm AI write action      |   Yes | Depends on permission | Depends on permission | Depends on permission |     No |

### 8.3 Permission Rule

AI cannot bypass role permissions.

If a user cannot perform an action manually, the AI must not allow that user to perform the same action.

---

## 9. Inventory Model

The system must support three types of inventory tracking, matching the `Tracking Type` column in the inventory spreadsheet.

### 9.1 Individual Asset

Used when each physical item is unique or valuable and should be tracked one row per physical unit (usually with a serial number or asset tag). These are managed through `ItemUnit` records.

Examples:

```txt
AIO Computer Lenovo - ASE-COMP-001
LG 24 inch Monitor    - ASE-MON-001
Router MikroTik       - ASE-NET-001
```

### 9.2 Bulk Stock

Used when many similar items are counted together and individual units do not need to be distinguished. These items are typically borrowed and returned.

Examples:

```txt
HDMI Cable x8
Ethernet Cable x10
Sleeping Bag x2
```

### 9.3 Consumable

Used for items expected to be used up and not returned (depleted over time). Tracked by quantity with a minimum-stock threshold for restock warnings.

Examples:

```txt
Whiteboard Marker x12
Cable Tie x100
Batteries x20
```

### 9.4 Tracking Type

```txt
INDIVIDUAL_ASSET
BULK_STOCK
CONSUMABLE
```

`INDIVIDUAL_ASSET` is unit-based and uses `ItemUnit`. `BULK_STOCK` and `CONSUMABLE` are quantity-based; the difference is that consumables are depleted rather than borrowed and returned.

---

## 10. Item Categories

Categories are stored in the database (see `Category` model), not as an enum. The initial seed list must match the `Category` column in the spreadsheet's `Lookup Lists` sheet:

```txt
Computer
AIO Computer
Monitor
Peripheral
Cable
Network
Storage
Tool
Furniture
Game / Board Game
Utility
Consumable
Misc
```

Use the per-item `Subcategory / Type` field for finer classification (e.g., Utility → Sleeping Equipment, Cable → HDMI).

Categories are editable by admin later. Categories must support soft-delete (archive) instead of hard delete, because items reference them.

---

## 11. Item Locations

Locations are stored in the database (see `Location` model), not hardcoded. The initial seed list must match the `Location` column in the spreadsheet's `Lookup Lists` sheet:

```txt
ASE Lab Room
Main Desk
Cabinet A
Cabinet B
Cable Box
Tool Box
Project Area
Storage Shelf
Server Area
Unknown
```

Each item also has a free-text `Storage Detail` field for the specific spot within a location (e.g., `Cable Box / HDMI section`).

Like categories, locations must support soft-delete (archive) instead of hard delete, because items reference them.

---

## 12. Item Conditions and Availability

### 12.1 Condition

Condition enum (matches the `Condition` column in the spreadsheet):

```txt
NEW
GOOD
FAIR
NEEDS_REPAIR
BROKEN
LOST
UNKNOWN
```

Condition meaning:

| Condition    | Meaning                                          |
| ------------ | ------------------------------------------------ |
| NEW          | Item is new / unused.                            |
| GOOD         | Item is usable and in good shape.                |
| FAIR         | Item is usable but worn.                         |
| NEEDS_REPAIR | Item needs repair; follow up in Maintenance Log. |
| BROKEN       | Item is broken and not usable.                   |
| LOST         | Item cannot be found.                            |
| UNKNOWN      | Condition has not been checked yet.              |

`NEEDS_REPAIR` and `BROKEN` items should be followed up via the Maintenance Log (see Section 14.9).

### 12.2 Availability Status

Separate from physical condition, every item has an availability/lifecycle status (matches the `Availability Status` column). This captures lifecycle states that a simple archived/not-archived boolean cannot:

```txt
AVAILABLE
IN_USE
BORROWED
MAINTENANCE
MISSING
RETIRED
DISPOSED
```

| Status      | Meaning                                                          |
| ----------- | ---------------------------------------------------------------- |
| AVAILABLE   | In stock and ready to use or borrow.                             |
| IN_USE      | Currently in active use in the lab (not formally borrowed out).  |
| BORROWED    | Checked out via a borrow record.                                 |
| MAINTENANCE | Under repair / inspection; see Maintenance Log.                  |
| MISSING     | Cannot currently be located.                                     |
| RETIRED     | No longer in service but kept on record.                         |
| DISPOSED    | Removed / discarded; kept only for history.                      |

`RETIRED` and `DISPOSED` replace hard-deletion for end-of-life items. `isArchived` is still used to hide an item from normal search, but lifecycle state lives in this enum.

---

## 13. Ownership / Source

Captures where an item came from (matches the `Owner / Source` column in the spreadsheet).

Owner/source enum:

```txt
LAB_PURCHASE
UNIVERSITY_ASSET
DONATION
PERSONAL_LOAN
UNKNOWN
```

Meaning:

| Owner / Source   | Meaning                                                     |
| ---------------- | ----------------------------------------------------------- |
| LAB_PURCHASE     | Bought using ASE lab funds.                                 |
| UNIVERSITY_ASSET | Owned by the university and assigned to the lab.            |
| DONATION         | Given to the lab by a member or third party.                |
| PERSONAL_LOAN    | Temporarily belongs to a member but stored/used in the lab. |
| UNKNOWN          | Ownership is unclear.                                       |

For `PERSONAL_LOAN` and `DONATION`, record the person in the item's `Owner Name` and/or `Responsible PIC` fields for accountability.

---

## 14. Database Design

### 14.1 User

Stores authorized Telegram users.

```prisma
model User {
  id                String   @id @default(uuid())
  telegramId        String   @unique
  telegramUsername  String?
  fullName          String
  nim               String?
  role              UserRole
  isActive          Boolean  @default(true)

  borrowRecords     BorrowRecord[] @relation("Borrower")
  approvedBorrows   BorrowRecord[] @relation("Approver")
  auditLogs          AuditLog[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum UserRole {
  ADMIN
  COORDINATOR
  ASSISTANT
  TRUSTED_MEMBER
  VIEWER
}
```

---

### 14.2 Category

```prisma
model Category {
  id         String   @id @default(uuid())
  name       String   @unique
  isArchived Boolean  @default(false)
  items      Item[]

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

---

### 14.3 Location

```prisma
model Location {
  id         String     @id @default(uuid())
  name       String     @unique
  isArchived Boolean    @default(false)
  items      Item[]
  itemUnits  ItemUnit[]

  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}
```

---

### 14.4 Item

```prisma
model Item {
  id                 String             @id @default(uuid())
  code               String             @unique // Item ID, e.g. ASE-CAB-001
  name               String
  category           Category           @relation(fields: [categoryId], references: [id])
  categoryId         String
  subcategory        String?            // Subcategory / Type
  trackingType       TrackingType
  brandModel         String?            // Brand / Model
  description        String?            // Specification / Description
  serialNumber       String?            // for single-unit items not split into ItemUnit
  assetTag           String?            // Asset Tag / Label Code (physical label)

  quantity           Int?               // current total quantity (maps to spreadsheet "Quantity")
  quantityAvailable  Int?               // system-maintained: total minus active borrows (not in spreadsheet)
  unit               String?            // pcs, set, box, roll, pair, pack, meter
  minimumStock       Int?               // restock warning threshold

  condition          ItemCondition      @default(UNKNOWN)
  availabilityStatus AvailabilityStatus @default(AVAILABLE)

  location           Location?          @relation(fields: [locationId], references: [id])
  locationId         String?
  storageDetail      String?            // specific spot within the location

  responsiblePic     String?            // Responsible PIC
  ownerSource        OwnerSource        @default(UNKNOWN)
  ownerName          String?

  acquiredAt         DateTime?          // Purchase / Acquisition Date
  purchasePrice      Decimal?           // Purchase Price (IDR)
  warrantyExpiry     DateTime?

  lastCheckedDate    DateTime?
  checkFrequencyDays Int?
  nextCheckDue       DateTime?          // computed: lastCheckedDate + checkFrequencyDays

  photoLink          String?            // Photo / Receipt Link (URL only; no upload)
  notes              String?
  isArchived         Boolean            @default(false)

  units              ItemUnit[]
  borrowRecords      BorrowRecord[]
  maintenanceLogs    MaintenanceLog[]

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@index([name])
  @@index([categoryId])
  @@index([locationId])
  @@index([availabilityStatus])
}

enum TrackingType {
  INDIVIDUAL_ASSET
  BULK_STOCK
  CONSUMABLE
}

enum ItemCondition {
  NEW
  GOOD
  FAIR
  NEEDS_REPAIR
  BROKEN
  LOST
  UNKNOWN
}

enum AvailabilityStatus {
  AVAILABLE
  IN_USE
  BORROWED
  MAINTENANCE
  MISSING
  RETIRED
  DISPOSED
}

enum OwnerSource {
  LAB_PURCHASE
  UNIVERSITY_ASSET
  DONATION
  PERSONAL_LOAN
  UNKNOWN
}
```

---

### 14.5 ItemUnit

Used only for `INDIVIDUAL_ASSET` tracking type.

```prisma
model ItemUnit {
  id                 String             @id @default(uuid())
  itemId             String
  item               Item               @relation(fields: [itemId], references: [id])

  unitCode           String             @unique // Asset Tag / Label Code for this unit
  serialNumber       String?
  brandModel         String?
  specs              String?

  condition          ItemCondition      @default(UNKNOWN)
  availabilityStatus AvailabilityStatus @default(AVAILABLE)

  locationId         String?
  location           Location?          @relation(fields: [locationId], references: [id])
  storageDetail      String?

  warrantyExpiry     DateTime?
  notes              String?
  isArchived         Boolean            @default(false)

  borrowRecords      BorrowRecord[]
  maintenanceLogs    MaintenanceLog[]

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@index([itemId])
  @@index([availabilityStatus])
}
```

---

### 14.6 BorrowRecord

```prisma
model BorrowRecord {
  id                 String          @id @default(uuid())

  // Borrower may be a registered user OR an external person (free text).
  borrowerId         String?
  borrower           User?           @relation("Borrower", fields: [borrowerId], references: [id])
  borrowerName       String          // required even for external borrowers
  borrowerContact    String?         // Telegram handle, phone, etc.

  itemId             String
  item               Item            @relation(fields: [itemId], references: [id])

  itemUnitId         String?
  itemUnit           ItemUnit?       @relation(fields: [itemUnitId], references: [id])

  quantity           Int?

  borrowedAt         DateTime        @default(now())
  dueDate            DateTime?
  returnedAt         DateTime?
  returnCondition    ReturnCondition?

  approvedById       String?
  approvedBy         User?           @relation("Approver", fields: [approvedById], references: [id])

  purpose            String?
  notes              String?

  status             BorrowStatus    @default(BORROWED)

  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  @@index([status])
  @@index([borrowerId])
  @@index([itemId])
}

enum BorrowStatus {
  BORROWED
  RETURNED
  OVERDUE
  DAMAGED
  LOST
}

enum ReturnCondition {
  SAME_AS_BORROWED
  GOOD
  DAMAGED
  MISSING
  NEEDS_REPAIR
}
```

---

### 14.7 AuditLog

```prisma
model AuditLog {
  id          String      @id @default(uuid())

  actorUserId String?
  actorUser   User?       @relation(fields: [actorUserId], references: [id])
  source      AuditSource @default(BOT)

  action      String
  entityType  String
  entityId    String?

  beforeData  Json?
  afterData   Json?

  createdAt   DateTime    @default(now())

  @@index([entityType, entityId])
  @@index([action])
}

enum AuditSource {
  BOT
  AI
  SYSTEM
}
```

---

### 14.8 AiPendingAction

Stores AI-proposed actions before user confirmation.

```prisma
model AiPendingAction {
  id              String   @id @default(uuid())

  userId          String
  telegramChatId  String
  actionType      String

  payload         Json
  status          AiPendingActionStatus @default(PENDING)

  expiresAt       DateTime

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum AiPendingActionStatus {
  PENDING
  CONFIRMED
  CANCELLED
  EXPIRED
}
```

`expiresAt` is enforced two ways: it is checked when an action is read/confirmed, and a scheduled background job (NestJS cron) periodically flips overdue `PENDING` actions to `EXPIRED` so stale proposals cannot be confirmed.

---

### 14.9 MaintenanceLog

Records inspections, repairs, cleaning, replacements, purchases, and disposals. This matches the spreadsheet's `Maintenance Log` sheet and gives the system first-class maintenance history (previously only a single `condition` field existed).

```prisma
model MaintenanceLog {
  id             String                @id @default(uuid())

  itemId         String
  item           Item                  @relation(fields: [itemId], references: [id])

  itemUnitId     String?
  itemUnit       ItemUnit?             @relation(fields: [itemUnitId], references: [id])

  date           DateTime              @default(now())
  actionType     MaintenanceActionType
  finding        String?               // Issue / Finding
  actionTaken    String?
  cost           Decimal?              // Cost (IDR)
  doneBy         String?               // Done By (PIC name)
  nextActionDate DateTime?
  status         MaintenanceStatus     @default(OPEN)
  notes          String?

  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt

  @@index([itemId])
  @@index([status])
}

enum MaintenanceActionType {
  INSPECTION
  CLEANING
  REPAIR
  REPLACEMENT
  PURCHASE
  DISPOSAL
}

enum MaintenanceStatus {
  OPEN
  IN_PROGRESS
  DONE
  WAITING_APPROVAL
}
```

`MaintenanceActionType` matches the `Maintenance Action` lookup (Inspection, Cleaning, Repair, Replacement, Purchase, Disposal) and `MaintenanceStatus` matches the `Maintenance Status` lookup (Open, In Progress, Done, Waiting Approval).

---

## 15. Telegram Bot Commands

### 15.1 General Commands

```txt
/start
/help
/me
```

### 15.2 User Management Commands

Admin only:

```txt
/register_user
/list_users
/update_user_role
/deactivate_user
/activate_user
```

Example:

```txt
/register_user
```

Flow:

```txt
Bot: Enter Telegram ID.
User: 123456789
Bot: Enter full name.
User: Muhammad Zhafran Ilham
Bot: Enter NIM.
User: 130122xxxx
Bot: Select role.
User: ADMIN / ASSISTANT / TRUSTED_MEMBER / VIEWER
Bot: Confirm registration?
```

---

## 16. Inventory Commands

### 16.1 Add Item

```txt
/add_item
```

Flow:

```txt
Bot: Item name?
User: HDMI Cable

Bot: Category?
User: Cable

Bot: Tracking type?
User: Bulk Stock

Bot: Quantity?
User: 8

Bot: Unit?
User: pcs

Bot: Minimum stock?
User: 3

Bot: Location?
User: Cable Box

Bot: Storage detail?
User: HDMI section

Bot: Condition?
User: Good

Bot: Owner / source?
User: Lab Purchase

Bot: Notes?
User: Bought for ASE event.

Bot: Confirm?
User: Yes
```

Expected result:

```txt
Item created successfully.

Code: ASE-CAB-001
Name: HDMI Cable
Quantity: 8 pcs
Location: Cable Box
```

Item codes follow the spreadsheet convention `ASE-<CATEGORY>-<NUMBER>` (e.g., `ASE-CAB-001`, `ASE-MON-001`, `ASE-GAME-001`). The code maps directly to the spreadsheet's `Item ID` column and becomes the database `Item.code`. Other example codes in this document are illustrative; the real convention is the `ASE-` prefixed format.

---

### 16.2 Search Item

```txt
/search_item
```

Supported search filters:

```txt
Name
Category
Location
Condition
Owner / Source
Availability
```

Example:

```txt
/search_item hdmi
```

Bot response:

```txt
Found 2 items:

1. HDMI Cable
   Code: CAB-HDMI-001
   Available: 4 / 5
   Location: Cable Box
   Condition: Good

2. HDMI Adapter
   Code: CAB-HDMI-002
   Available: 1 / 1
   Location: Middle Drawer
   Condition: Good
```

---

### 16.3 View Item Detail

```txt
/view_item
```

Example:

```txt
/view_item ASE-CAB-001
```

Response:

```txt
Item Detail

Code: ASE-CAB-001
Name: HDMI Cable
Category: Cable
Tracking Type: Bulk Stock
Quantity: 5 pcs
Available Quantity: 4
Minimum Stock: 3
Location: Cable Box
Storage Detail: HDMI section
Condition: Good
Availability Status: Available
Owner / Source: Lab Purchase
Notes: Bought for ASE event.

Currently Borrowed:
- 1 borrowed by Farhan
```

---

### 16.4 Update Item

```txt
/update_item
```

Editable fields:

```txt
Name
Description
Subcategory / Type
Brand / Model
Category
Location
Storage Detail
Condition
Availability Status
Owner / Source
Owner Name
Responsible PIC
Quantity
Minimum Stock
Unit
Warranty Expiry
Notes
```

All updates must be logged in `AuditLog`.

---

### 16.5 Move Item

```txt
/move_item
```

Flow:

```txt
Bot: Enter item code.
User: CAB-HDMI-001

Bot: Current location: Cable Box
Bot: New location?
User: Middle Drawer

Bot: Confirm move?
User: Yes
```

---

### 16.6 Archive Item

```txt
/archive_item
```

Items should not be hard-deleted unless necessary.

Archiving keeps historical borrow records safe.

---

## 17. Borrowing Commands

### 17.1 Borrow Item

```txt
/borrow_item
```

Flow for bulk / consumable item:

```txt
Bot: Enter item name or code.
User: HDMI Cable

Bot: Found HDMI Cable.
Available: 4 / 5
How many do you want to borrow?
User: 1

Bot: Purpose?
User: For ASE external event.

Bot: Expected return note?
User: After event tomorrow.

Bot: Confirm borrowing?
User: Yes
```

Result:

```txt
Borrow recorded.

Item: HDMI Cable
Quantity: 1
Borrower: Muhammad Zhafran Ilham
Status: Borrowed
```

Flow for individual-asset item:

```txt
Bot: Enter item name or code.
User: Monitor LG

Bot: Available units:
1. MON-LG-001
2. MON-LG-002

Bot: Choose unit.
User: MON-LG-001

Bot: Purpose?
User: Demo booth.

Bot: Confirm borrowing?
User: Yes
```

---

### 17.2 Return Item

```txt
/return_item
```

Flow:

```txt
Bot: Your currently borrowed items:
1. HDMI Cable x1
2. Monitor LG MON-LG-001

Bot: Choose item to return.
User: 1

Bot: Condition after return?
User: Good

Bot: Notes?
User: No problem.

Bot: Confirm return?
User: Yes
```

---

### 17.3 Who Has Item?

```txt
/who_has
```

Example:

```txt
/who_has HDMI Cable
```

Response:

```txt
Currently borrowed:

1. HDMI Cable x1
   Borrower: Farhan
   Borrowed at: 2026-06-20
   Purpose: Event setup
```

---

### 17.4 My Borrowed Items

```txt
/my_borrowed
```

Shows items currently borrowed by the current user.

---

## 18. Report Commands

### 18.1 Report List

```txt
/report
```

Bot shows report options:

```txt
Choose report type:

1. Inventory Summary
2. Borrowed Items
3. Damaged Items
4. Lost Items
5. Unknown Location Items
6. Member-Owned Items
7. Low Stock Items
8. Warranty Expiry
9. Maintenance Due
10. Activity Log
11. Export CSV
```

---

### 18.2 Inventory Summary Report

```txt
/report inventory
```

Example response:

```txt
ASE Inventory Summary

Total item types: 86
Bulk / consumable items: 61
Individual-asset items: 25
Total unit-tracked assets: 30

Available items: 74
Currently borrowed: 8
Damaged items: 4
Lost items: 1
Unknown location: 7
Member-owned items in lab: 11
```

---

### 18.3 Borrowed Items Report

```txt
/report borrowed
```

Example:

```txt
Currently Borrowed Items

1. HDMI Cable x1
   Borrower: Farhan
   Borrowed At: 2026-06-20
   Purpose: Event setup

2. Sleeping Bag x1
   Borrower: Dimas
   Borrowed At: 2026-06-18
   Purpose: Lab overnight
```

---

### 18.4 Damaged Items Report

```txt
/report damaged
```

Shows all items needing repair or broken (condition `NEEDS_REPAIR` / `BROKEN`) and items under maintenance (availability `MAINTENANCE`).

---

### 18.5 Unknown Location Report

```txt
/report unknown_location
```

Shows items with unclear location.

This is important for the first real inventory cleanup.

---

### 18.6 Ownership Report

```txt
/report ownership
```

Shows:

```txt
Lab-owned items
Member-loaned items
Member-donated items
Unknown ownership items
```

---

### 18.7 Low Stock Report

```txt
/report low_stock
```

Lists bulk and consumable items where current quantity is at or below `minimumStock`. Drives restock decisions and mirrors the spreadsheet Dashboard's low-stock metric.

---

### 18.8 Warranty Expiry Report

```txt
/report warranty
```

Lists items whose warranty has expired or expires soon (based on `warrantyExpiry`).

---

### 18.9 Maintenance Due Report

```txt
/report maintenance_due
```

Lists items whose `nextCheckDue` date is today or past, plus open Maintenance Log entries (`status` = OPEN / IN_PROGRESS / WAITING_APPROVAL).

---

### 18.10 Export Report

```txt
/export_report
```

Initial export format:

```txt
CSV
```

Later export format:

```txt
Excel
PDF
```

Recommended implementation order:

```txt
1. Telegram text report
2. CSV export
3. Excel export
4. PDF export
```

---

## 19. AI Assistant Design

### 19.1 AI Goals

The AI assistant should help users interact with the bot using natural language.

Supported languages:

```txt
Indonesian
English
Mixed Indonesian-English
```

Example messages:

```txt
Ada kabel HDMI gak?
Where is the Logitech mouse?
Barang apa aja yang lagi dipinjam?
Catat monitor LG dipinjam Farhan.
Tambahin 3 kabel type C ke drawer.
```

---

### 19.2 AI Safety Rules

1. AI must not directly modify the database.
2. AI must return structured JSON.
3. Backend must validate the AI output.
4. Write actions require confirmation.
5. User permissions still apply.
6. AI cannot access commands that the user is not allowed to use.
7. Failed or unclear AI parsing should ask the user to clarify.

---

### 19.3 AI Intent Types

Read-only intents:

```txt
SEARCH_ITEMS
VIEW_ITEM_DETAIL
LIST_BORROWED_ITEMS
LIST_DAMAGED_ITEMS
LIST_UNKNOWN_LOCATION_ITEMS
LIST_MEMBER_OWNED_ITEMS
GENERATE_SUMMARY
UNKNOWN
```

Write-action intents:

```txt
ADD_ITEM
UPDATE_ITEM
MOVE_ITEM
BORROW_ITEM
RETURN_ITEM
MARK_DAMAGED
MARK_LOST
UPDATE_QUANTITY
```

---

### 19.4 AI Structured Output Format

Example read-only response:

```json
{
  "intent": "SEARCH_ITEMS",
  "confidence": 0.91,
  "language": "id",
  "filters": {
    "name": "HDMI Cable",
    "category": "Cable",
    "condition": null,
    "location": null,
    "availability": "AVAILABLE"
  },
  "missingFields": [],
  "replyMessage": "Saya akan mencari item yang cocok dengan HDMI Cable."
}
```

Example write-action response:

```json
{
  "intent": "BORROW_ITEM",
  "confidence": 0.88,
  "language": "id",
  "action": {
    "itemName": "Monitor LG",
    "borrowerName": "Farhan",
    "quantity": 1,
    "purpose": "acara besok",
    "dueDate": null
  },
  "missingFields": [],
  "requiresConfirmation": true,
  "replyMessage": "Saya memahami bahwa Monitor LG akan dipinjam oleh Farhan untuk acara besok."
}
```

Example unclear response:

```json
{
  "intent": "UNKNOWN",
  "confidence": 0.32,
  "language": "id",
  "missingFields": ["itemName", "actionType"],
  "replyMessage": "Saya belum paham item apa yang ingin dikelola. Bisa sebutkan nama barangnya?"
}
```

---

### 19.5 AI Confirmation Flow

For write actions:

```txt
User sends natural language message
    ↓
AI parses intent
    ↓
Backend validates parsed intent
    ↓
Backend checks user permission
    ↓
Bot shows action preview
    ↓
User confirms or cancels
    ↓
If confirmed, backend executes service method
    ↓
Audit log is created
```

---

### 19.6 AI Provider Abstraction

Create an interface:

```ts
export interface AiProvider {
  parseInventoryIntent(input: AiIntentInput): Promise<AiIntentResult>;
}
```

Provider implementations:

```txt
NoneAiProvider
GeminiAiProvider
OpenAiProvider
OllamaAiProvider
```

Environment variable:

```env
AI_PROVIDER=none
```

Allowed values:

```txt
none
gemini
openai
ollama
```

The app should still work when `AI_PROVIDER=none`.

---

### 19.7 Enum and Display Label Mapping

Database enums are stored in English uppercase (e.g., `NEEDS_REPAIR`), but the spreadsheet and the bot use human-readable, bilingual labels (e.g., "Needs Repair" / "Perlu Perbaikan"). Maintain an explicit mapping layer that:

- Converts DB enums to display labels for bot output and CSV/Excel exports.
- Maps spreadsheet labels and natural-language phrases back to DB enums on import and AI parsing.
- Provides both Indonesian and English labels for every enum value (Condition, AvailabilityStatus, OwnerSource, TrackingType, BorrowStatus, ReturnCondition, MaintenanceActionType, MaintenanceStatus).

This keeps AI parsing reliable when users type free-form Indonesian/English, and ensures exports match the spreadsheet's vocabulary exactly.

---

## 20. Bot Conversation State

Some commands require multi-step input.

Example:

```txt
/add_item
```

The bot needs to remember the user's current flow.

Use a conversation/session state object.

Example:

```ts
type BotSession = {
  currentFlow?: "ADD_ITEM" | "BORROW_ITEM" | "RETURN_ITEM" | "REGISTER_USER";
  step?: string;
  data?: Record<string, unknown>;
};
```

For early implementation, in-memory session is acceptable.

For production, store session in database or Redis.

Recommended first version:

```txt
In-memory session
```

Future improvement:

```txt
Database-backed session
```

Caveat: in-memory sessions are lost if the bot restarts mid-flow (e.g., during `/add_item`), so the user must restart the command. This is acceptable for early versions but is the main reason to move to a database- or Redis-backed session store for production.

---

## 21. Business Rules

### 21.1 User Rules

1. Only registered active users can use private bot features.
2. Unregistered users only receive a message telling them to contact admin.
3. Admin can manually register users.
4. Telegram ID is the primary bot identity.
5. Full name and NIM should be stored for accountability.

---

### 21.2 Item Rules

1. Every item must have a name.
2. Every item must have a category.
3. Every item must have a tracking type (`INDIVIDUAL_ASSET`, `BULK_STOCK`, or `CONSUMABLE`).
4. Bulk and consumable items must have a quantity; the system maintains `quantityAvailable` as total minus active borrows.
5. Individual-asset items should have item units.
6. Each item should declare a `unit` (pcs, set, box, etc.).
7. Bulk and consumable items should have a `minimumStock`; when current quantity ≤ minimum stock, the item is flagged as low stock.
8. Quantity updates and borrow/return operations that change `quantityAvailable` must run inside a database transaction to avoid race conditions.
9. Categories and locations are never hard-deleted; they are archived. End-of-life items are marked `RETIRED`/`DISPOSED` via `availabilityStatus`, not deleted.
10. Archived items should not appear in normal search unless explicitly requested.
11. Item code (`code`) must be unique and follow the `ASE-<CATEGORY>-<NUMBER>` convention.

---

### 21.3 Borrowing Rules

1. A user can borrow an available item.
2. Quantity-based item cannot be borrowed beyond available quantity.
3. Unit-based item cannot be borrowed if the selected unit is already borrowed.
4. Borrow records should not be deleted.
5. Returning an item updates the borrow record.
6. Returning an item may update its condition.
7. Damaged return should be recorded.
8. Lost item should be recorded.

---

### 21.4 Report Rules

1. Reports should only include active inventory by default.
2. Admin can include archived items if needed.
3. Borrowed report shows only active borrow records.
4. Activity report uses audit logs.
5. Exported reports should use dummy data in public demo.

---

### 21.5 AI Rules

1. AI read-only features may answer directly.
2. AI write actions must create pending action first.
3. Pending action expires after a configured time.
4. AI confirmation must use Telegram inline buttons.
5. AI output must be validated before use.
6. AI confidence below threshold should ask clarification.
7. A scheduled job (NestJS cron) marks expired pending actions as `EXPIRED`; expiry is also enforced on read so a stale action can never be confirmed.

Recommended confidence threshold:

```txt
0.70
```

---

### 21.6 Maintenance Rules

1. Repairs, inspections, cleaning, replacements, purchases, and disposals are recorded in `MaintenanceLog`.
2. Setting an item's condition to `NEEDS_REPAIR` or `BROKEN`, or its availability to `MAINTENANCE`, should prompt a maintenance log entry.
3. `lastCheckedDate` + `checkFrequencyDays` derive `nextCheckDue`; items past due appear in the Maintenance Due report.
4. Retiring or disposing an item sets `availabilityStatus` to `RETIRED`/`DISPOSED` instead of deleting it.

---

## 22. Error Handling

### 22.1 Common Error Cases

| Error Case           | Expected Bot Response                                           |
| -------------------- | --------------------------------------------------------------- |
| User not registered  | You are not registered. Please contact the admin.               |
| User inactive        | Your account is inactive. Please contact the admin.             |
| Permission denied    | You do not have permission to perform this action.              |
| Item not found       | I could not find that item. Try another keyword.                |
| Quantity unavailable | Requested quantity is higher than available stock.              |
| Unit unavailable     | This unit is currently borrowed or unavailable.                 |
| Invalid input        | The input format is invalid. Please try again.                  |
| AI unclear           | I am not sure what you mean. Please clarify the item or action. |
| Internal error       | Something went wrong. Please try again later.                   |

---

## 23. Validation Requirements

Use DTO or validation logic for:

```txt
User registration
Role update
Item creation
Item update
Borrow request
Return request
Maintenance log entry
AI parsed action
Report export request
```

Important validations:

```txt
quantity >= 0
quantityAvailable <= quantity
minimumStock >= 0
purchasePrice >= 0
telegramId must be unique
item code must be unique
role must be valid enum
trackingType must be valid enum
condition must be valid enum
availabilityStatus must be valid enum
ownerSource must be valid enum
borrow quantity <= available quantity
borrow due date must be on or after borrow date
```

---

## 24. Audit Logging Requirements

### 24.1 Actions to Log

```txt
USER_REGISTERED
USER_ROLE_UPDATED
USER_DEACTIVATED
USER_ACTIVATED

ITEM_CREATED
ITEM_UPDATED
ITEM_ARCHIVED
ITEM_MOVED
ITEM_CONDITION_UPDATED
ITEM_QUANTITY_UPDATED

ITEM_BORROWED
ITEM_RETURNED
ITEM_MARKED_LOST
ITEM_RETURNED_DAMAGED
ITEM_MARKED_MISSING
ITEM_RETIRED
ITEM_DISPOSED
ITEM_LOW_STOCK_FLAGGED

MAINTENANCE_LOGGED
MAINTENANCE_UPDATED

REPORT_GENERATED
REPORT_EXPORTED

AI_READ_REQUESTED
AI_ACTION_PROPOSED
AI_ACTION_CONFIRMED
AI_ACTION_CANCELLED
AI_ACTION_EXPIRED
```

### 24.2 Audit Log Format

Each audit log should store:

```txt
actorUserId
action
entityType
entityId
beforeData
afterData
createdAt
```

Example:

```json
{
  "actorUserId": "user-id",
  "action": "ITEM_MOVED",
  "entityType": "Item",
  "entityId": "item-id",
  "beforeData": {
    "location": "Cable Box"
  },
  "afterData": {
    "location": "Middle Drawer"
  }
}
```

---

## 25. Testing Plan

### 25.1 Unit Tests

Test service logic:

```txt
UsersService
InventoryService
BorrowingService
ReportsService
AiService
```

Important tests:

```txt
Admin can register user
Non-admin cannot register user
Can create bulk / consumable item
Can create individual-asset item
Cannot borrow more than available quantity
Cannot borrow already borrowed unit
Can return borrowed item
Returning item restores available quantity
Damaged return updates condition
Low stock is flagged when quantity <= minimum stock
Maintenance log entry is recorded for repairs
AI write action requires confirmation
```

---

### 25.2 Integration Tests

Test module interaction:

```txt
Create item → borrow item → return item
Register user → check role permission
Generate report from seeded data
AI parsed action → pending confirmation → confirmed execution
```

---

### 25.3 Manual Telegram Tests

Manual checklist:

```txt
/start works
/help works
/me works
Unregistered user is blocked
Admin can register user
Registered user can search item
Assistant can add item
Trusted member cannot add item
User can borrow item
User can return item
Report command works
AI read-only question works
AI write action asks confirmation
Cancel AI action does not change database
```

---

## 26. Deployment Plan

### 26.1 Local Development

Use:

```txt
Node.js
PostgreSQL
Prisma
Telegram Bot Token
.env file
```

Example `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/quartermaster"
TELEGRAM_BOT_TOKEN="your-token"
AI_PROVIDER="none"
NODE_ENV="development"
```

Development command:

```bash
npm run start:dev
```

---

### 26.2 Production Deployment

Initial production can run on the lab server.

Recommended process:

```txt
1. Clone repository
2. Install dependencies
3. Set production .env
4. Run Prisma migration
5. Build project
6. Start bot with PM2, systemd, or Docker
```

Recommended first production runner:

```txt
PM2
```

Later improvement:

```txt
Docker Compose
```

---

### 26.3 Backup Plan

Database backup is important because this project stores real inventory data.

Minimum backup:

```txt
Manual PostgreSQL dump
```

Future backup:

```txt
Scheduled daily backup
Backup rotation
Off-server backup copy
```

---

## 27. Security and Privacy

### 27.1 Secrets

Never commit:

```txt
.env
Telegram bot token
AI API key
Database password
```

Use `.env.example` for documentation.

---

### 27.2 Public Repository Rule

The public GitHub repository must not contain real ASE inventory data.

Use dummy data only.

Allowed public data:

```txt
Dummy users
Dummy items
Dummy borrow records
Screenshots with fake data
Architecture diagrams
README
Demo video using fake data
```

Not allowed:

```txt
Real member NIM
Real Telegram ID
Real borrowed item records
Private lab information
Actual server credentials
```

---

## 28. Documentation Plan

Create these documents:

```txt
README.md
docs/DESIGN.md
docs/ARCHITECTURE.md
docs/DATABASE.md
docs/BOT_COMMANDS.md
docs/AI_DESIGN.md
docs/DEPLOYMENT.md
docs/TESTING.md
docs/ROADMAP.md
```

### 28.1 README Structure

```md
# Project Quartermaster

## Overview

## Problem Background

## Features

## Tech Stack

## Architecture

## Bot Commands

## AI Assistant

## Database Design

## Setup Guide

## Demo Data

## Screenshots

## Roadmap

## License
```

---

## 29. Implementation Roadmap

### Version 0.1.0 — Bot Foundation

Features:

```txt
/start
/help
/me
Project setup
Database setup
Prisma setup
Admin seed user
Basic role checking
```

Success criteria:

```txt
Bot runs locally.
Admin user exists.
Registered users can use /me.
Unregistered users are blocked.
```

---

### Version 0.2.0 — Inventory MVP

Features:

```txt
/add_item
/search_item
/view_item
/update_item
/archive_item
Category support
Location support
Bulk / consumable item support
```

Success criteria:

```txt
Admin or assistant can create inventory items.
Users can search and view items.
Item data is stored in database.
```

---

### Version 0.3.0 — Individual-Asset Inventory

Features:

```txt
Individual-asset item support
ItemUnit model
Unit code
Unit condition
Unit location
Unit availability
```

Success criteria:

```txt
The system can track monitors, PCs, and other unique assets individually.
```

---

### Version 0.4.0 — Borrowing System

Features:

```txt
/borrow_item
/return_item
/who_has
/my_borrowed
Borrow history
Quantity validation
Unit validation
```

Success criteria:

```txt
Users can borrow and return items.
System prevents invalid borrowing.
Borrow history is preserved.
```

---

### Version 0.5.0 — Reports

Features:

```txt
/report inventory
/report borrowed
/report damaged
/report lost
/report unknown_location
/report ownership
CSV export
```

Success criteria:

```txt
Logistics assistant can generate useful inventory reports.
```

---

### Version 0.6.0 — Audit Logs

Features:

```txt
AuditLog model
Automatic logging for important actions
Admin audit log view
```

Success criteria:

```txt
Important changes are traceable.
```

---

### Version 0.7.0 — AI Read-Only Assistant

Features:

```txt
/ask
Natural language search
Indonesian and English support
Structured AI output
Safe read-only query execution
```

Success criteria:

```txt
User can ask inventory questions naturally.
AI does not modify database.
```

---

### Version 0.8.0 — AI Action Assistant

Features:

```txt
AI proposed add/update/borrow/return actions
Pending action storage
Telegram confirmation buttons
Permission validation
Audit logging
```

Success criteria:

```txt
AI can help perform actions, but only after user confirmation.
```

---

### Version 1.0.0 — Portfolio Release

Features:

```txt
Stable command system
Inventory management
Borrowing system
Reports
Audit logs
AI assistant
Dummy seed data
Documentation
Demo video
Deployment guide
Basic tests
```

Success criteria:

```txt
Project is presentable on GitHub and usable by ASE.
```

---

## 30. Suggested Git Branch Strategy

Use simple Git workflow:

```txt
main
develop
feature/bot-foundation
feature/user-roles
feature/inventory-crud
feature/borrowing
feature/reports
feature/ai-assistant
feature/deployment
```

Commit style:

```txt
feat: add inventory item creation flow
fix: prevent borrowing unavailable item unit
docs: add database design documentation
test: add borrowing service tests
refactor: simplify role guard
```

---

## 31. Suggested Agent Implementation Instructions

When using an AI coding agent, implement the project in this order:

```txt
1. Initialize NestJS project with TypeScript.
2. Add Prisma and database connection.
3. Create User model and seed admin user.
4. Add Telegram bot module.
5. Implement /start, /help, and /me.
6. Implement role guard.
7. Implement Category and Location models.
8. Implement Item model.
9. Implement /add_item command.
10. Implement /search_item command.
11. Implement /view_item command.
12. Implement /update_item command.
13. Implement ItemUnit model.
14. Implement unit-based item creation.
15. Implement BorrowRecord model.
16. Implement /borrow_item.
17. Implement /return_item.
18. Implement /who_has and /my_borrowed.
19. Implement reports.
20. Implement CSV export.
21. Implement AuditLog.
22. Implement AI provider interface.
23. Implement AI read-only assistant.
24. Implement AI pending action confirmation.
25. Add tests.
26. Add documentation.
27. Prepare production deployment.
```

Important instruction for agent:

```txt
Do not implement AI before the command-based inventory and borrowing system works.
Do not implement web dashboard.
Do not implement image upload.
Do not use microservices.
Keep the system as a modular monolith.
Prioritize working features over overengineering.
```

---

## 32. MVP Definition

The MVP is considered complete when:

```txt
1. Bot can run locally.
2. Admin can register users.
3. Registered users can use /me.
4. Admin or assistant can add inventory items.
5. Users can search items.
6. Users can view item details.
7. Users can borrow items.
8. Users can return items.
9. Bot can generate basic borrowed item report.
10. Data is stored in PostgreSQL/MariaDB.
```

AI is not required for MVP.

---

## 33. Final Feature List

### Core Features

```txt
User registration
Role-based access
Inventory item creation
Inventory item search
Inventory item detail
Inventory item update
Inventory item archive
Category management
Location management
Bulk / consumable tracking
Individual-asset tracking
Minimum stock / low-stock alerts
Maintenance / inspection log
Borrow item
Return item
Borrowing history
Who has item
My borrowed items
Reports
CSV export
Audit logs
```

### AI Features

```txt
Natural language item search
Natural language report question
Bilingual Indonesian-English understanding
Intent classification
Structured JSON output
Read-only AI query
AI action proposal
Confirmation before database write
AI action audit logging
Provider-agnostic AI service
```

### Future Features

```txt
Excel export
PDF export
Web dashboard
QR code labels
Barcode scanning
Item photos
Scheduled backup
Advanced analytics
Restock recommendation
Repair history
Multi-lab support
```

---

## 34. Final Notes

Project Quartermaster should be developed as a practical tool first and a portfolio project second.

The most important first achievement is not AI. The most important first achievement is having a reliable system where ASE inventory can finally be recorded, searched, borrowed, returned, and reported.

Once the inventory data is reliable, AI becomes genuinely useful.

Recommended implementation order:

```txt
Command Bot
Database
Inventory
Borrowing
Reports
Audit Logs
AI Read-Only
AI Confirmation Actions
Deployment
Documentation
```

This keeps the project realistic, useful, and impressive without becoming too large for a beginner.
