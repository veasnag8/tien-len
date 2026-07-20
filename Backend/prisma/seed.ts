import { PrismaClient, AuthProvider } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  await prisma.user.upsert({
    where: { email: 'demo@tienlen.app' },
    update: {},
    create: {
      email: 'demo@tienlen.app',
      passwordHash,
      nickname: 'DemoPlayer',
      country: 'VN',
      provider: AuthProvider.email,
      gamesPlayed: 12,
      wins: 7,
      points: 140,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
