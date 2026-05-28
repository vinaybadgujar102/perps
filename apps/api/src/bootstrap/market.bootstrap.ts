import { prisma } from "@repo/database";
import { AssetConfig } from "@repo/sharedtypes";

export const bootstrapMarkets = async () => {
  const entries = Object.values(AssetConfig);

  if (entries.length === 0) {
    return;
  }

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
};
