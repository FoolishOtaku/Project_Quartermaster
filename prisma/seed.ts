/**
 * Seed script — creates (or updates) the first administrator account.
 *
 * Reads ADMIN_TELEGRAM_ID and ADMIN_FULL_NAME from the environment.
 * Run with: npm run db:seed
 */
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const telegramId = process.env.ADMIN_TELEGRAM_ID?.trim();
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'ASE Administrator';

  if (!telegramId) {
    throw new Error(
      'ADMIN_TELEGRAM_ID is not set. Add it to your .env file before seeding.',
    );
  }

  const admin = await prisma.user.upsert({
    where: { telegramId },
    update: {
      role: UserRole.ADMIN,
      isActive: true,
      fullName,
    },
    create: {
      telegramId,
      fullName,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seeded admin user: ${admin.fullName} (telegramId=${admin.telegramId}, role=${admin.role})`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
