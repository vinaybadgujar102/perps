import type { Orderbook } from "../inMemoryStates";

export const FUNDING_INTERVAL_MS = Number(
  process.env.FUNDING_INTERVAL_MS ?? 8 * 60 * 60 * 1000,
);

export class PerpetualMarket {
  symbol: string;
  orderbook: Orderbook;
  fundingRate: number;
  markPrice: number;
  indexPrice: number;
  nextFundingTime: number;

  constructor(symbol: string, orderbook: Orderbook) {
    this.symbol = symbol;
    this.orderbook = orderbook;
    this.fundingRate = 0;
    this.markPrice = 0;
    this.indexPrice = 0;
    this.nextFundingTime = Date.now() + FUNDING_INTERVAL_MS;
  }
}

export class PerpetualMarketManager {
  private markets: Record<string, PerpetualMarket> = {};

  addMarket(symbol: string, orderbook: Orderbook) {
    if (this.markets[symbol]) {
      throw new Error("Perpetual market already exists!");
    }
    this.markets[symbol] = new PerpetualMarket(symbol, orderbook);
  }

  getMarket(symbol: string) {
    const market = this.markets[symbol];
    if (!market) {
      throw new Error(`Perpetual market not found: ${symbol}`);
    }
    return market;
  }
}

export const GLOBAL_PERPETUAL_MARKETS = new PerpetualMarketManager();
