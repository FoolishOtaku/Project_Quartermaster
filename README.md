# Project Quartermaster

A Telegram-based inventory management bot for the **ASE Software Engineering
Laboratory** at Telkom University. It lets authorized members record, search,
borrow, return, and report lab inventory through a Telegram bot, with an
optional AI assistant added in later versions.

> **Current release: v0.1.0 — Bot Foundation.**
> Runnable bot with `/start`, `/help`, `/me`, an admin seed user, and
> role-based access foundations.

## Features in v0.1.0

- NestJS (TypeScript) modular monolith.
- PostgreSQL + Prisma ORM.
- Telegram bot via Telegraf (`nestjs-telegraf`).
- Commands: `/start`, `/help`, `/me`.
- Admin seed user from environment variables.
- Registration check + basic role-checking guards.
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
  schema.prisma        # User model + UserRole enum
  seed.ts              # Admin seed script
src/
  main.ts              # Bootstrap (worker context)
  app.module.ts        # Root module (config, Telegraf, Prisma, Users, Bot)
  prisma/              # PrismaModule + PrismaService
  users/               # UsersModule, service, repository, types
  bot/                 # BotModule, update handlers, service, messages, context
  common/              # Guards, decorators, constants (role checking)
docs/
  QUICKSTART.md        # Step-by-step setup and run guide
  REQUIREMENTS.md      # Scope and acceptance criteria for v0.1.0
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
- [Requirements (v0.1.0)](docs/REQUIREMENTS.md)
- [Design document & roadmap](Design.md)

## License

See [LICENSE](LICENSE).
