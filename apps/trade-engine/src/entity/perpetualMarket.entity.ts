import type { Orderbook } from "../inMemoryStates";

class PerpetualMarket {
  symbol: string;
  orderbook: Orderbook;
  fundingRate: number;
  markPrice: number;
  indexPrice: number;

  constructor(symbol: string, ordderbook: Orderbook) {
    this.symbol = symbol;
    this.orderbook = ordderbook;
    this.fundingRate = 0;
    this.markPrice = 0;
    this.indexPrice = 0;
  }
}
