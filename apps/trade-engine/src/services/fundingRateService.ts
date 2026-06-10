export class FundingRateService {
  calculateFundingRate(markPrice: number, lastTradedPrice: number) {
    // very basic formulae is to compare the mark price and our orderbook's last trade price
    const rate = (markPrice - lastTradedPrice) / 100;

    // most exchanges have cap on what the rates can be
    const fundingRate = Math.max(-0.05, Math.min(0.55, rate));
    return fundingRate;
  }

  calculateFundingRateFees(positionSize: number, fundingRate: number) {
    const fees = positionSize * fundingRate;
    return fees;
  }
}
