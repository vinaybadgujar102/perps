import { prisma } from "@repo/database";
import { AssetConfig } from "@repo/sharedtypes";
import bcrypt from "bcrypt";

const SIM_PASSWORD_PLACEHOLDER = "sim-user-not-for-login";

export async function seedDemoMarkets(): Promise<void> {
  const entries = Object.values(AssetConfig);

  await Promise.all(
    entries.map((entry) =>
      prisma.market.upsert({
        where: { symbol: entry.symbol },
        create: {
          symbol: entry.symbol,
          priceScale: entry.priceScale,
          quantityScale: entry.quantityScale,
          maxLeverage: entry.maxLeverage,
          isActive: true,
        },
        update: {},
      }),
    ),
  );
}

export async function seedSimUsersInDb(userIds: number[]): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(SIM_PASSWORD_PLACEHOLDER, 10);

  for (const userId of userIds) {
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        name: `Sim Trader ${userId}`,
        email: `sim-${userId}@demo.local`,
        password: passwordHash,
      },
      update: {},
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"User"', 'id'), GREATEST((SELECT MAX(id) FROM "User"), 1))`,
  );
}

export type DemoLoginUser = {
  userId: number;
  email: string;
  password: string;
};

export async function ensureDemoLoginUserInDb(
  email = process.env.DEMO_USER_EMAIL ?? "demo@perps.local",
  password = process.env.DEMO_USER_PASSWORD ?? "demo1234",
): Promise<DemoLoginUser> {
  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true },
  });

  if (existing) {
    return {
      userId: existing.id,
      email: existing.email,
      password,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: "Demo Trader",
      email,
      password: passwordHash,
    },
    select: { id: true, email: true },
  });

  return {
    userId: user.id,
    email: user.email,
    password,
  };
}

export async function seedDemoDatabase(userIds: number[]): Promise<void> {
  await seedDemoMarkets();
  await seedSimUsersInDb(userIds);
}
