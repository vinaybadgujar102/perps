import { AssetConfig, SIDE, type Position, type Side } from "@repo/sharedtypes";
import type { Order } from "../types";
import { POSITIONS } from "../inMemoryStates";
import { calculateLiquidationPrice } from "./liquidation.util";
import { settleRealizedPnl } from "./pnl.util";

export const positionFactory = (
  order: Order,
  requiredCollateral: number,
  averageEntryPrice: number,
): Position => {
  return {
    id: crypto.randomUUID(),
    orderId: order.id,
    market: order.market,
    collateralUser: requiredCollateral,
    userId: order.userId,
    size: order.filledQty * (order.side === SIDE.LONG ? 1 : -1),
    averageEntryPrice,
    estimatedLiquidationPrice: 0,
    realizedPnl: 0,
    createdAt: new Date(),
  };
};

export const generatePositionKey = (userId: string, market: string) =>
  `${userId}_${market}`;

type CreatePositionParams = {
  userId: number;
  orderId: string;
  market: string;
  side: Side;
  filledQty: number;
  fillPrice: number;
};

function positionSideFromSize(size: number): Side {
  return size > 0 ? SIDE.LONG : SIDE.SHORT;
}

function estimatedLiquidationPrice(
  size: number,
  averageEntryPrice: number,
  collateral: number,
): number {
  return calculateLiquidationPrice(positionSideFromSize(size), {
    qty: Math.abs(size),
    averageEntryPrice,
    collateral,
  });
}

export const createPosition = ({
  userId,
  orderId,
  market,
  side,
  filledQty,
  fillPrice,
}: CreatePositionParams): void => {
  const positionMapKey = generatePositionKey(userId.toString(), market);

  const assetConfig = AssetConfig[market]!;
  const maxLeverage = assetConfig.maxLeverage;

  const signedFilledSize = filledQty * (side === SIDE.LONG ? 1 : -1);

  const fillNotional = filledQty * fillPrice;

  const fillMargin = fillNotional / maxLeverage;

  const currentPosition = POSITIONS.get(positionMapKey);

  if (!currentPosition) {
    const newPosition: Position = {
      id: crypto.randomUUID(),
      orderId,
      userId,
      market,
      createdAt: new Date(),
      size: signedFilledSize,
      collateralUser: fillMargin,
      averageEntryPrice: fillPrice,
      realizedPnl: 0,
      estimatedLiquidationPrice: estimatedLiquidationPrice(
        signedFilledSize,
        fillPrice,
        fillMargin,
      ),
    };

    POSITIONS.set(positionMapKey, newPosition);
    lockUserMargin(userId, fillMargin);

    return;
  }

  const oldSize = currentPosition.size;

  const updatedSize = signedFilledSize + oldSize;

  const sameDirection = Math.sign(oldSize) === Math.sign(signedFilledSize);

  if (sameDirection) {
    const weightedEntryPrice =
      (currentPosition.averageEntryPrice * Math.abs(oldSize) +
        fillPrice * Math.abs(signedFilledSize)) /
      Math.abs(updatedSize);

    const updatedCollateral = currentPosition.collateralUser + fillMargin;

    const updatedPosition: Position = {
      ...currentPosition,

      size: updatedSize,

      collateralUser: updatedCollateral,

      averageEntryPrice: weightedEntryPrice,
      realizedPnl: currentPosition.realizedPnl,
      estimatedLiquidationPrice: estimatedLiquidationPrice(
        updatedSize,
        weightedEntryPrice,
        updatedCollateral,
      ),
    };

    POSITIONS.set(positionMapKey, updatedPosition);
    lockUserMargin(userId, fillMargin);

    return;
  }

  const closedQty = Math.min(Math.abs(signedFilledSize), Math.abs(oldSize));
  const releasedCollateral =
    currentPosition.collateralUser * (closedQty / Math.abs(oldSize));

  if (Math.abs(signedFilledSize) < Math.abs(oldSize)) {
    const slicePnl =
      settleRealizedPnl({
        userId,
        market,
        signedPositionSizeBeforeClose: oldSize,
        averageEntryPrice: currentPosition.averageEntryPrice,
        closedQty,
        releasedCollateral,
      }) ?? 0;

    const updatedCollateral =
      currentPosition.collateralUser - releasedCollateral;

    const updatedPosition: Position = {
      ...currentPosition,
      estimatedLiquidationPrice: estimatedLiquidationPrice(
        updatedSize,
        currentPosition.averageEntryPrice,
        updatedCollateral,
      ),
      size: updatedSize,
      collateralUser: updatedCollateral,
      averageEntryPrice: currentPosition.averageEntryPrice,
      realizedPnl: currentPosition.realizedPnl + slicePnl,
    };

    POSITIONS.set(positionMapKey, updatedPosition);

    return;
  }

  if (updatedSize === 0) {
    settleRealizedPnl({
      userId,
      market,
      signedPositionSizeBeforeClose: oldSize,
      averageEntryPrice: currentPosition.averageEntryPrice,
      closedQty,
      releasedCollateral,
    });

    POSITIONS.delete(positionMapKey);

    return;
  }

  const slicePnl =
    settleRealizedPnl({
      userId,
      market,
      signedPositionSizeBeforeClose: oldSize,
      averageEntryPrice: currentPosition.averageEntryPrice,
      closedQty,
      releasedCollateral,
    }) ?? 0;

  const updatedCollateral = (Math.abs(updatedSize) * fillPrice) / maxLeverage;

  const updatedPosition: Position = {
    ...currentPosition,

    size: updatedSize,

    collateralUser: updatedCollateral,

    averageEntryPrice: fillPrice,
    realizedPnl: slicePnl,
    estimatedLiquidationPrice: estimatedLiquidationPrice(
      updatedSize,
      fillPrice,
      updatedCollateral,
    ),
  };

  POSITIONS.set(positionMapKey, updatedPosition);
  lockUserMargin(userId, updatedCollateral);
};
