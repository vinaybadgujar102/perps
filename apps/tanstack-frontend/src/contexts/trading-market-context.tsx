import { AssetConfig, SYMBOLS } from "@repo/sharedtypes";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "trading-market";
const MARKETS = Object.values(SYMBOLS);

type TradingMarketContextValue = {
  market: string;
  setMarket: (market: string) => void;
  markets: readonly string[];
  config: (typeof AssetConfig)[string];
};

const TradingMarketContext = createContext<TradingMarketContextValue | null>(
  null,
);

function readStoredMarket(): string {
  if (typeof window === "undefined") return SYMBOLS.BTC;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && MARKETS.includes(stored as SYMBOLS)) {
    return stored;
  }

  return SYMBOLS.BTC;
}

export function TradingMarketProvider({ children }: { children: ReactNode }) {
  const [market, setMarketState] = useState(readStoredMarket);

  const setMarket = (next: string) => {
    if (!MARKETS.includes(next as SYMBOLS)) return;
    setMarketState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <TradingMarketContext.Provider
      value={{
        market,
        setMarket,
        markets: MARKETS,
        config: AssetConfig[market],
      }}
    >
      {children}
    </TradingMarketContext.Provider>
  );
}

export function useTradingMarket() {
  const context = useContext(TradingMarketContext);
  if (!context) {
    throw new Error("useTradingMarket must be used within TradingMarketProvider");
  }
  return context;
}
