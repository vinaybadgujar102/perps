import { AssetConfig, type Position } from "@repo/sharedtypes";
import type { Order } from "../types";
import { POSITIONS } from "../inMemoryStates";
import { calculateLiquidationPrice } from "./liquidation.util";

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
    size: order.filledQty * (order.type === "LONG" ? 1 : -1),
    averageEntryPrice,
    estimatedLiquidationPrice: 0,
    createdAt: new Date(),
  };
};

export const generatePositionKey = (userId: string, market: string) =>
  `${userId}_${market}`;

type CreatePositionParams = {
  userId: number;
  orderId: string;
  market: string;

  orderType: "LONG" | "SHORT";

  filledQty: number;
  fillPrice: number;
};

function positionSideFromSize(size: number): "LONG" | "SHORT" {
  return size > 0 ? "LONG" : "SHORT";
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
  orderType,
  filledQty,
  fillPrice,
}: CreatePositionParams) => {
  const positionMapKey = generatePositionKey(userId.toString(), market);

  const assetConfig = AssetConfig[market]!;
  const maxLeverage = assetConfig.maxLeverage;

  const signedFilledSize = filledQty * (orderType === "LONG" ? 1 : -1);

  const fillNotional = filledQty * fillPrice;

  const fillMargin = fillNotional / maxLeverage;

  let currentPosition = POSITIONS.get(positionMapKey);

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
      estimatedLiquidationPrice: estimatedLiquidationPrice(
        signedFilledSize,
        fillPrice,
        fillMargin,
      ),
    };

    POSITIONS.set(positionMapKey, newPosition);

    return;
  }

  const oldSize = currentPosition.size;

  const updatedSize = signedFilledSize + oldSize;

  const sameDiredtion = Math.sign(oldSize) === Math.sign(signedFilledSize);

  if (sameDiredtion) {
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
      estimatedLiquidationPrice: estimatedLiquidationPrice(
        updatedSize,
        weightedEntryPrice,
        updatedCollateral,
      ),
    };

    POSITIONS.set(positionMapKey, updatedPosition);

    return;
  }

  if (Math.abs(signedFilledSize) < Math.abs(oldSize)) {
    const updatedCollateral =
      currentPosition.collateralUser *
      (Math.abs(updatedSize) / Math.abs(oldSize));

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
    };

    POSITIONS.set(positionMapKey, updatedPosition);

    return;
  }
  if (updatedSize === 0) {
    POSITIONS.delete(positionMapKey);

    return;
  }

  const updatedCollateral = (Math.abs(updatedSize) * fillPrice) / maxLeverage;

  const updatedPosition: Position = {
    ...currentPosition,

    size: updatedSize,

    collateralUser: updatedCollateral,

    averageEntryPrice: fillPrice,
    estimatedLiquidationPrice: estimatedLiquidationPrice(
      updatedSize,
      fillPrice,
      updatedCollateral,
    ),
  };

  POSITIONS.set(positionMapKey, updatedPosition);
};
