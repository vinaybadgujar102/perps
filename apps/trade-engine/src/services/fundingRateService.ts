export class FundingRateService {
  calculateFundingRate(markPrice: number, lastTradedPrice: number) {
    if (lastTradedPrice <= 0) {
      return 0;
    }

    const rate = (markPrice - lastTradedPrice) / lastTradedPrice;
    return Math.max(-0.05, Math.min(0.55, rate));
  }

  calculateFundingRateFees(
    positionSize: number,
    markPrice: number,
    fundingRate: number,
  ): number {
    const notionalInt = Math.abs(positionSize) * markPrice;
    const feeEngine = Math.round(notionalInt * fundingRate);
    return Math.sign(positionSize) * feeEngine;
  }
}
