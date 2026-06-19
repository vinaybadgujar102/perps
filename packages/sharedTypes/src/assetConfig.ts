export const AssetConfig: Record<
  string,
  {
    symbol: string;
    priceScale: number;
    quantityScale: number;
    maxLeverage: number;
  }
> = {
  BTC: {
    symbol: "BTC",
    priceScale: 2,
    quantityScale: 2,
    maxLeverage: 20,
  },
};
