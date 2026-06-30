# Project Quartermaster — Quickstart (v0.1.0)

This guide takes you from a clean checkout to a running Telegram bot with a
working `/start`, `/help`, and `/me`, plus a seeded admin account.

Estimated time: **15–25 minutes.**

---

## 1. What you will build

Version 0.1.0 is the **Bot Foundation**. By the end of this guide:

- The bot runs locally and connects to Telegram.
- A PostgreSQL database exists with a `users` table.
- One **admin** user is seeded.
- `/start` and `/help` work for anyone.
- `/me` shows the account details of **registered** users.
- **Unregistered** users are politely blocked.

---

## 2. Prerequisites

Install these before you start:

| Tool       | Version         | Check command    |
| ---------- | --------------- | ---------------- |
| Node.js    | 18 LTS or newer | `node --version` |
| npm        | 9 or newer      | `npm --version`  |
| PostgreSQL | 14 or newer     | `psql --version` |
| Git        | any recent      | `git --version`  |

You also need:

- A **Telegram account**.
- A **bot token** from [@BotFather](https://t.me/BotFather).
- Your **numeric Telegram ID** (get it from [@userinfobot](https://t.me/userinfobot)).

---

## 3. Get a Telegram bot token

1. Open Telegram and start a chat with **@BotFather**.
2. Send `/newbot`.
3. Choose a display name (e.g. `ASE Quartermaster`).
4. Choose a username ending in `bot` (e.g. `ase_quartermaster_bot`).
5. BotFather replies with a token like `123456789:AAH...`. Copy it.

> Keep this token secret. Anyone with it can control your bot.

---

## 4. Find your Telegram ID

1. Open a chat with **@userinfobot**.
2. Send any message.
3. It replies with your numeric `Id` (e.g. `987654321`). Copy it — this becomes
   the first admin.

---

## 5. Create the database

Create an empty PostgreSQL database named `quartermaster`:

```bash
# Using psql (adjust user/host as needed)
psql -U postgres -c "CREATE DATABASE quartermaster;"
```

Or with Docker, if you prefer not to install PostgreSQL locally:

```bash
docker run --name quartermaster-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=quartermaster \
  -p 5432:5432 \
  -d postgres:16
```

---

## 6. Install dependencies

From the project root:

```bash
npm install
```

---

## 7. Configure environment variables

Copy the example file and edit it:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Open `.env` and set:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quartermaster?schema=public"
TELEGRAM_BOT_TOKEN="123456789:AAH-your-real-token"
ADMIN_TELEGRAM_ID="987654321"
ADMIN_FULL_NAME="Your Name"
NODE_ENV="development"
```

> `DATABASE_URL` must match the database you created in step 5.
> `ADMIN_TELEGRAM_ID` is the ID from step 4.

---

## 8. Generate the Prisma client and run the migration

```bash
# Generate the typed Prisma client
npm run prisma:generate

# Create the database tables (creates the initial migration)
npm run prisma:migrate
```

When prompted for a migration name, enter something like `init_user`.

You should now have a `users` table. Verify with Prisma Studio (optional):

```bash
npm run prisma:studio
```

---

## 9. Seed the admin user

```bash
npm run db:seed
```

Expected output:

```txt
Seeded admin user: Your Name (telegramId=987654321, role=ADMIN)
```

This reads `ADMIN_TELEGRAM_ID` and `ADMIN_FULL_NAME` from `.env`. Running it
again is safe — it upserts (updates) the same admin.

---

## 10. Run the bot

For development with auto-reload:

```bash
npm run start:dev
```

You should see:

```txt
[Nest] LOG [PrismaService] Connected to the database
[Nest] LOG [Bootstrap] Project Quartermaster bot is running (v0.1.0)
```

The process stays running and listens to Telegram via long polling. Leave it
open.

---

## 11. Try it in Telegram

Open a chat with **your bot** (the username from step 3).

| You send | As the seeded admin             | As an unregistered user                             |
| -------- | ------------------------------- | --------------------------------------------------- |
| `/start` | Welcome message                 | Welcome message                                     |
| `/help`  | Help / command list             | Help / command list                                 |
| `/me`    | Your name, role (Admin), status | "You are not registered. Please contact the admin." |

To test the unregistered case, message the bot from a **different** Telegram
account that has not been seeded.

---

## 12. Stop the bot

Press `Ctrl + C` in the terminal. Shutdown hooks disconnect Prisma cleanly.

---

## 13. Production run (optional)

```bash
npm run build
npm run prisma:deploy   # applies migrations without prompts
npm run start:prod
```

For a long-lived process, run it under a process manager such as PM2:

```bash
npm install -g pm2
pm2 start dist/main.js --name quartermaster
pm2 save
```

---

## 14. Troubleshooting

| Symptom                                                 | Likely cause / fix                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `Configuration key "TELEGRAM_BOT_TOKEN" does not exist` | `.env` missing or token not set. Re-check step 7.                          |
| `Can't reach database server`                           | PostgreSQL not running, or wrong`DATABASE_URL`. Re-check steps 5 and 7.    |
| `ADMIN_TELEGRAM_ID is not set`                          | Add`ADMIN_TELEGRAM_ID` to `.env`, then re-run `npm run db:seed`.           |
| `401: Unauthorized` from Telegram                       | The bot token is wrong. Re-copy it from BotFather.                         |
| Bot does not respond                                    | Another instance may already be polling the same token. Stop duplicates.   |
| `/me` says you are not registered (as admin)            | The seed used a different ID than your account. Confirm with @userinfobot. |

---

## 15. What's next

See the roadmap in `Design.md` (Section 29). The next milestone is **v0.2.0 —
Inventory MVP** (`/add_item`, `/search_item`, `/view_item`, `/update_item`,
`/archive_item`, plus category and location support).
