# Project Quartermaster — Requirements (v0.1.0)

This document defines the scope, requirements, and acceptance criteria for
**Version 0.1.0 — Bot Foundation**. It is derived from `Design.md` (Sections 29
and 32) and narrowed to what this release delivers.

---

## 1. Release goal

Establish a runnable, database-backed Telegram bot foundation with user
identity and access control, on top of which inventory features will be built
in later versions.

The most important outcome: the bot **runs locally**, an **admin exists**,
**registered users** can identify themselves, and **unregistered users are
blocked**.

---

## 2. In scope (v0.1.0)

- Project setup (NestJS + TypeScript).
- Database setup (PostgreSQL) and Prisma ORM.
- `User` model and `UserRole` enum.
- Admin seed user (from environment variables).
- Telegram bot integration (Telegraf via `nestjs-telegraf`).
- Commands: `/start`, `/help`, `/me`.
- Registration check (block unregistered/inactive users).
- Basic role checking infrastructure (`@Roles()` + guards).
- Unit tests for core service logic.
- Quickstart and requirements documentation.

## 3. Out of scope (this version)

Deferred to later versions per the roadmap:

- Inventory items, categories, locations (v0.2.0+).
- Unit-based assets / `ItemUnit` (v0.3.0).
- Borrowing and returning (v0.4.0).
- Reports and exports (v0.5.0).
- Audit logging (v0.6.0).
- AI assistant (v0.7.0+).
- Web dashboard, image upload, barcode/QR, multi-lab support.

---

## 4. Functional requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | The bot connects to Telegram using a token from configuration.                               | Must     |
| FR-2  | `/start` replies with a welcome message to **any** user.                                     | Must     |
| FR-3  | `/help` replies with the command list to **any** user.                                       | Must     |
| FR-4  | `/me` replies with the caller's account details (name, role, status, IDs).                   | Must     |
| FR-5  | `/me` is denied to users who are not in the database, with a clear message.                  | Must     |
| FR-6  | `/me` is denied to users whose account is inactive, with a clear message.                    | Must     |
| FR-7  | A seed script creates/updates one admin user from `ADMIN_TELEGRAM_ID`.                       | Must     |
| FR-8  | The seed is idempotent (re-running does not create duplicates).                              | Must     |
| FR-9  | A reusable role-checking mechanism exists (`@Roles()` + `RolesGuard`).                        | Should   |
| FR-10 | Users have one of: ADMIN, COORDINATOR, ASSISTANT, TRUSTED_MEMBER, VIEWER.                     | Must     |

---

## 5. Non-functional requirements

| ID     | Requirement                                                                            |
| ------ | -------------------------------------------------------------------------------------- |
| NFR-1  | Written in TypeScript with NestJS modular structure (modular monolith).                |
| NFR-2  | Secrets (bot token, DB URL) come from environment variables, never committed.          |
| NFR-3  | Database access goes through Prisma; no raw SQL in v0.1.0.                              |
| NFR-4  | The app exits with a clear error if required configuration is missing.                  |
| NFR-5  | Prisma connects on startup and disconnects cleanly on shutdown.                         |
| NFR-6  | Core service logic is covered by unit tests that run without a live database.           |
| NFR-7  | Telegram IDs are unique (`telegramId @unique`).                                         |

---

## 6. Data model (v0.1.0)

Only the `User` model is required this version:

```prisma
model User {
  id               String   @id @default(uuid())
  telegramId       String   @unique
  telegramUsername String?
  fullName         String
  nim              String?
  role             UserRole @default(VIEWER)
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@map("users")
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

## 7. Environment variables

| Variable             | Required | Purpose                                            |
| -------------------- | -------- | -------------------------------------------------- |
| `DATABASE_URL`       | Yes      | PostgreSQL connection string for Prisma.           |
| `TELEGRAM_BOT_TOKEN` | Yes      | Bot token from @BotFather.                          |
| `ADMIN_TELEGRAM_ID`  | Yes (seed) | Numeric Telegram ID of the first admin.          |
| `ADMIN_FULL_NAME`    | No       | Display name for the seeded admin.                 |
| `NODE_ENV`           | No       | `development` or `production`.                     |

---

## 8. Commands

| Command  | Access            | Behavior                                              |
| -------- | ----------------- | ----------------------------------------------------- |
| `/start` | Everyone          | Welcome message and command overview.                 |
| `/help`  | Everyone          | List of available commands.                           |
| `/me`    | Registered, active | Show name, NIM, username, Telegram ID, role, status. |

---

## 9. Error / edge-case handling

| Case                        | Expected response                                              |
| --------------------------- | -------------------------------------------------------------- |
| Unregistered user runs `/me` | "You are not registered. Please contact the admin to get access." |
| Inactive user runs `/me`    | "Your account is inactive. Please contact the admin."          |
| Missing Telegram identity   | "Something went wrong. Please try again later."                |
| Permission denied (future role-guarded command) | "You do not have permission to perform this action." |

---

## 10. Acceptance criteria

This version is **done** when all of the following hold (maps to Design.md §29 / §32):

1. `npm install`, `npm run prisma:generate`, and `npm run build` complete without errors.
2. `npm test` passes.
3. `npm run db:seed` creates an admin user; re-running it does not duplicate.
4. `npm run start:dev` starts the bot and connects to the database.
5. `/start` and `/help` respond for any user.
6. `/me` returns account details for the seeded admin.
7. `/me` from an unregistered account returns the "not registered" message.

---

## 11. Verification checklist

- [ ] Build succeeds (`npm run build`).
- [ ] Unit tests pass (`npm test`).
- [ ] Prisma migration applied; `users` table exists.
- [ ] Admin seeded and visible in Prisma Studio.
- [ ] `/start`, `/help` work for any account.
- [ ] `/me` works for the admin.
- [ ] `/me` blocks an unregistered account.
