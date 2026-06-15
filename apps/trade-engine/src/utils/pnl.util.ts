import { GLOBAL_ORDERBOOK } from "../inMemoryStates";
import { USERMANAGER } from "../appState";

export function getMarkPrice(market: string): number | null {
  const book = GLOBAL_ORDERBOOK.getOrderbook(market);
  if (!book || book.indexPrice <= 0) {
    return null;
  }
  return book.indexPrice;
}

export function calculateRealizedPnl({
  markPrice,
  averageEntryPrice,
  closedQty,
  signedPositionSizeBeforeClose,
}: {
  markPrice: number;
  averageEntryPrice: number;
  closedQty: number;
  signedPositionSizeBeforeClose: number;
}): number {
  return (
    (markPrice - averageEntryPrice) *
    closedQty *
    Math.sign(signedPositionSizeBeforeClose)
  );
}

export function settleRealizedPnl({
  userId,
  market,
  signedPositionSizeBeforeClose,
  averageEntryPrice,
  closedQty,
  releasedCollateral,
}: {
  userId: number;
  market: string;
  signedPositionSizeBeforeClose: number;
  averageEntryPrice: number;
  closedQty: number;
  releasedCollateral: number;
}): number | null {
  const markPrice = getMarkPrice(market);
  if (markPrice === null) {
    return null;
  }

  const realizedPnl = calculateRealizedPnl({
    markPrice,
    averageEntryPrice,
    closedQty,
    signedPositionSizeBeforeClose,
  });

  const user = USERMANAGER.getUser(userId);
  user.applyRealizedPnl(realizedPnl);
  user.unlockFunds(releasedCollateral);

  return realizedPnl;
}
