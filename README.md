# Project Quartermaster

A Telegram-based inventory management bot for the **ASE Software Engineering
Laboratory** at Telkom University. It lets authorized members record, search,
borrow, return, and report lab inventory through a Telegram bot, with an
optional AI assistant added in later versions.

> **Current release: v0.2.1 — Inventory MVP (button-driven flows).**
> Quantity-based inventory with categories and locations: `/add_item`,
> `/search_item`, `/view_item`, `/update_item`, `/archive_item`. Choices are
> made with tappable inline keyboards (with typing as a fallback), on top of the
> v0.1.0 foundation (`/start`, `/help`, `/me`, admin seed, role guards).

## Features in v0.2.1

- Inline-keyboard (button) driven `/add_item`, `/update_item`, and `/archive_item` —
  tap to choose category, tracking type, location, condition, owner/source, and
  to confirm; Skip/Cancel buttons for optional steps. Typing still works as a fallback.
- Category and Location models, seeded from the spreadsheet Lookup Lists.
- Quantity-based items (Bulk Stock / Consumable) with auto-generated codes.
- Search and view for any registered user; add/update for admin/assistant; archive for admin.
- Low-stock indicator in search and detail output.

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
  schema.prisma        # User, Category, Location, Item + enums
  seed.ts              # Admin + categories + locations seed
src/
  main.ts              # Bootstrap (worker context)
  app.module.ts        # Root module
  prisma/              # PrismaModule + PrismaService
  users/               # UsersModule, service, repository
  categories/          # CategoriesModule, service, repository
  locations/           # LocationsModule, service, repository
  inventory/           # InventoryModule: service, repository, item-code util, presenter, types
  bot/                 # Bot updates, services, messages, conversation state + flows
  common/              # Guards, decorators, constants (role checking)
docs/
  QUICKSTART.md        # Step-by-step setup and run guide
  REQUIREMENTS.md      # Acceptance criteria for v0.1.0
  REQUIREMENTS-0.2.0.md# Acceptance criteria for v0.2.0
  BOT_COMMANDS.md      # Command reference with example flows
Design.md              # Full software design document and roadmap
```

## Getting started

See **[docs/QUICKSTART.md](docs/QUICKSTART.md)** for the full setup walkthrough.

Quick version:

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
| `npm run start:dev`      | Run the bot with auto-reload.            |
| `npm run build`          | Compile to `dist/`.                      |
| `npm run start:prod`     | Run the compiled bot.                    |
| `npm run prisma:generate`| Generate the Prisma client.              |
| `npm run prisma:migrate` | Create/apply a dev migration.            |
| `npm run prisma:deploy`  | Apply migrations in production.          |
| `npm run db:seed`        | Seed/refresh the admin user.             |
| `npm test`               | Run unit tests.                          |

## Documentation

- [Quickstart](docs/QUICKSTART.md)
- [Bot commands](docs/BOT_COMMANDS.md)
- [Requirements (v0.1.0)](docs/REQUIREMENTS.md)
- [Requirements (v0.2.0)](docs/REQUIREMENTS-0.2.0.md)
- [Design document & roadmap](Design.md)

## License

See [LICENSE](LICENSE).
