#!/usr/bin/env bash
#
# Project Quartermaster — one-command quickstart (v0.5.0)
#
# Runs everything needed to get the bot running:
#   1. Ensures a .env exists (creates it from .env.example on first run)
#   2. Installs dependencies (only if node_modules is missing)
#   3. Generates the Prisma client
#   4. Applies database migrations (prisma migrate deploy)
#   5. Seeds the admin user, categories, and locations
#   6. Starts the bot (npm run start:dev)
#
# Usage:
#   bash scripts/quickstart.sh            # full setup + start
#   bash scripts/quickstart.sh --no-start # setup only
#
# Or via npm:
#   npm run quickstart:sh

set -euo pipefail

NO_START=false
if [ "${1:-}" = "--no-start" ]; then
  NO_START=true
fi

# Always run from the project root (parent of this script's folder).
cd "$(dirname "$0")/.."
echo "Project Quartermaster quickstart"
echo "Project root: $(pwd)"

# 1. Ensure .env exists.
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "Created .env from .env.example."
  echo "Open .env and fill in DATABASE_URL, TELEGRAM_BOT_TOKEN, and ADMIN_TELEGRAM_ID,"
  echo "then run this script again."
  exit 1
fi

# 2. Install dependencies if needed.
if [ ! -d node_modules ]; then
  echo ""
  echo "> npm install"
  npm install
else
  echo ""
  echo "Dependencies already installed (skipping npm install)."
fi

# 3-5. Generate client, apply migrations, seed.
echo ""; echo "> npm run prisma:generate"; npm run prisma:generate
echo ""; echo "> npm run prisma:deploy";   npm run prisma:deploy
echo ""; echo "> npm run db:seed";         npm run db:seed

if [ "$NO_START" = true ]; then
  echo ""
  echo "Setup complete. Start the bot with: npm run start:dev"
  exit 0
fi

# 6. Start the bot.
echo ""
echo "Setup complete. Starting the bot (press Ctrl+C to stop)..."
npm run start:dev
