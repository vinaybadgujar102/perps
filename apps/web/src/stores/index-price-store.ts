import { create } from "zustand";

type IndexPriceState = {
  prices: Record<string, number>;
  setPrice: (market: string, price: number) => void;
  removeSymbol: (market: string) => void;
};

export const useIndexPriceStore = create<IndexPriceState>((set) => ({
  prices: {},

  setPrice: (market, price) =>
    set((state) => ({
      prices: { ...state.prices, [market]: price },
    })),

  removeSymbol: (market) =>
    set((state) => {
      const next = { ...state.prices };
      delete next[market];
      return { prices: next };
    }),
}));

export const useIndexPrice = (symbol: string) =>
  useIndexPriceStore((state) => state.prices[symbol] ?? null);

export const useIndexPrices = () => useIndexPriceStore((state) => state.prices);
