/**
 * Seed script — creates the first admin and the initial categories/locations.
 *
 * Reads ADMIN_TELEGRAM_ID and ADMIN_FULL_NAME from the environment.
 * Run with: npm run db:seed
 */
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// Matches the "Category" column in the spreadsheet Lookup Lists sheet.
const CATEGORIES = [
  'Computer',
  'AIO Computer',
  'Monitor',
  'Peripheral',
  'Cable',
  'Network',
  'Storage',
  'Tool',
  'Furniture',
  'Game / Board Game',
  'Utility',
  'Consumable',
  'Misc',
];

// Matches the "Location" column in the spreadsheet Lookup Lists sheet.
const LOCATIONS = [
  'ASE Lab Room',
  'Main Desk',
  'Cabinet A',
  'Cabinet B',
  'Cable Box',
  'Tool Box',
  'Project Area',
  'Storage Shelf',
  'Server Area',
  'Unknown',
];

async function seedAdmin(): Promise<void> {
  const telegramId = process.env.ADMIN_TELEGRAM_ID?.trim();
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'ASE Administrator';

  if (!telegramId) {
    throw new Error(
      'ADMIN_TELEGRAM_ID is not set. Add it to your .env file before seeding.',
    );
  }

  const admin = await prisma.user.upsert({
    where: { telegramId },
    update: { role: UserRole.ADMIN, isActive: true, fullName },
    create: { telegramId, fullName, role: UserRole.ADMIN, isActive: true },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seeded admin user: ${admin.fullName} (telegramId=${admin.telegramId}, role=${admin.role})`,
  );
}

async function seedCategories(): Promise<void> {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${CATEGORIES.length} categories.`);
}

async function seedLocations(): Promise<void> {
  for (const name of LOCATIONS) {
    await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${LOCATIONS.length} locations.`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedCategories();
  await seedLocations();
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
