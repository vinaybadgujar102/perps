export class FundingRateService {
  /**
   *
   * @param markPrice
   * @param lastTradedPrice
   * @returns funding rate. if positive it means buyers are strong take fees from them and vice versa
   */
  calculateFundingRate(markPrice: number, lastTradedPrice: number) {
    // very basic formulae is to compare the mark price and our orderbook's last trade price
    const rate = (markPrice - lastTradedPrice) / 100;

    // most exchanges have cap on what the rates can be
    const fundingRate = Math.max(-0.05, Math.min(0.55, rate));
    return fundingRate;
  }

  /**
   *
   * @param positionSize
   * @param fundingRate
   * @returns fees.
   * 1. fundingRate: -0.05 (shorts should pay) positionsize = -100 (is short) -> 5
   * 2. fundingRate: -0.05 (shorts should pay) positionsize = 100 (is long) -> -5
   */
  calculateFundingRateFees(positionSize: number, fundingRate: number) {
    const fees = positionSize * fundingRate;
    return fees;
  }
}
