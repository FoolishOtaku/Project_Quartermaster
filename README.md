# Project Quartermaster

A Telegram-based inventory management bot for the **ASE Software Engineering
Laboratory** at Telkom University. It lets authorized members record, search,
borrow, return, and report lab inventory through a Telegram bot, with an
optional AI assistant added in later versions.

> **Current release: v0.4.0 — Borrowing System.**
> Borrow and return lab items — quantity stock or individual asset units — with
> transactional availability tracking and a permanent borrow history
> (`/borrow_item`, `/return_item`, `/who_has`, `/my_borrowed`), on top of the
> v0.3.0 individual-asset inventory and the v0.2.x Inventory MVP.

## Features in v0.4.0

- `BorrowRecord` model with borrow history (records are never deleted).
- `/borrow_item` (quantity or specific unit), `/return_item`, `/who_has`, `/my_borrowed`.
- Transactional borrow/return — no overselling or double-borrowing under concurrency.
- Per-unit return condition (Good / Damaged / Needs Repair / Missing) updates the unit's state.
- Role-gated borrowing (everyone except Viewer); view commands open to any registered user.

## Features from v0.3.0

- Individual-asset tracking via the `ItemUnit` model: one row per physical unit.
- `/add_item` supports the Individual Asset tracking type.
- Unit commands: `/add_unit`, `/view_unit`, `/update_unit`, `/archive_unit`.
- Auto-generated unit codes (`<itemCode>-U<NN>`), per-unit condition/location/availability.
- Parent item counts stay in sync with their active units.

## Features from v0.2.x

- Inline-keyboard (button) driven flows with typing fallback.
- Category and Location models, seeded from the spreadsheet Lookup Lists.
- Quantity-based items (Bulk Stock / Consumable) with auto-generated codes.
- Search and view for any registered user; add/update for admin/assistant; archive for admin.
- Low-stock indicator in search and detail output.
- One-command quickstart scripts (Windows + Unix).

## Features from v0.1.0

- NestJS (TypeScript) modular monolith.
- PostgreSQL + Prisma ORM.
- Telegram bot via Telegraf (`nestjs-telegraf`).
- Commands: `/start`, `/help`, `/me`.
- Admin seed user from environment variables.
- Registration check + role-checking guards.
- Unit tests for core service logic.

## Tech stack

| Layer    | Choice                          |
| -------- | ------------------------------- |
| Runtime  | Node.js + TypeScript            |
| Framework| NestJS                          |
| Bot      | Telegraf (`nestjs-telegraf`)    |
| Database | PostgreSQL                      |
| ORM      | Prisma                          |
| Tests    | Jest                            |

## Project structure

```txt
prisma/
  schema.prisma        # User, Category, Location, Item, ItemUnit, BorrowRecord + enums
  seed.ts              # Admin + categories + locations seed
src/
  main.ts              # Bootstrap (worker context)
  app.module.ts        # Root module
  prisma/              # PrismaModule + PrismaService
  users/               # UsersModule, service, repository
  categories/          # CategoriesModule, service, repository
  locations/           # LocationsModule, service, repository
  inventory/           # InventoryModule: items + units, code util, presenter, types
  borrowing/           # BorrowingModule: service, repository (transactions), presenter
  bot/                 # Bot updates, services, messages, conversation state + flows
  common/              # Guards, decorators, constants (role checking)
docs/
  QUICKSTART.md        # Step-by-step setup and run guide
  REQUIREMENTS.md      # Acceptance criteria for v0.1.0
  REQUIREMENTS-0.2.0.md# Acceptance criteria for v0.2.0
  REQUIREMENTS-0.3.0.md# Acceptance criteria for v0.3.0
  REQUIREMENTS-0.4.0.md# Acceptance criteria for v0.4.0
  BOT_COMMANDS.md      # Command reference with example flows
Design.md              # Full software design document and roadmap
```

## Getting started

See **[docs/QUICKSTART.md](docs/QUICKSTART.md)** for the full setup walkthrough.

### One command (recommended)

After filling in `.env`, run the bootstrap script — it installs deps, generates
the Prisma client, applies migrations, seeds the database, and starts the bot:

```bash
# Windows (PowerShell)
npm run quickstart:win

# macOS / Linux
npm run quickstart:sh
```

On the very first run it creates `.env` from `.env.example` and stops so you can
fill in `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, and `ADMIN_TELEGRAM_ID`; run it
again afterwards. Add `-NoStart` (PowerShell) or `--no-start` (bash) to set up
without launching the bot.

If your `.env` and dependencies are already in place, the cross-platform npm
shortcut does the same setup + start:

```bash
npm run quickstart
```

### Manual steps

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL, TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_ID
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run start:dev
```

## Scripts

| Script                   | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `npm run quickstart:win` | One-command setup + start (Windows).     |
| `npm run quickstart:sh`  | One-command setup + start (macOS/Linux). |
| `npm run quickstart`     | Setup + start (assumes .env + deps).     |
| `npm run setup`          | Generate, migrate, seed (no start).      |
| `npm run start:dev`      | Run the bot with auto-reload.            |
| `npm run build`          | Compile to `dist/`.                      |
| `npm run start:prod`     | Run the compiled bot.                    |
| `npm run prisma:generate`| Generate the Prisma client.              |
| `npm run prisma:migrate` | Create/apply a dev migration.            |
| `npm run prisma:deploy`  | Apply migrations in production.          |
| `npm run db:seed`        | Seed/refresh admin, categories, locations.|
| `npm test`               | Run unit tests.                          |

## Documentation

- [Quickstart](docs/QUICKSTART.md)
- [Bot commands](docs/BOT_COMMANDS.md)
- [Requirements (v0.1.0)](docs/REQUIREMENTS.md)
- [Requirements (v0.2.0)](docs/REQUIREMENTS-0.2.0.md)
- [Requirements (v0.3.0)](docs/REQUIREMENTS-0.3.0.md)
- [Requirements (v0.4.0)](docs/REQUIREMENTS-0.4.0.md)
- [Design document & roadmap](Design.md)

## License

See [LICENSE](LICENSE).
