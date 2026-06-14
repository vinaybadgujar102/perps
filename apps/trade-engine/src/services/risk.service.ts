import { AssetConfig } from "@repo/sharedtypes";
import type { OrderEntity } from "../entity/order.entity";
import { InsufficientMarginError } from "../errors";
import type { User } from "../utils/User.class";

export class RiskService {
  computeRequiredCollateral(market: string, price: number, qty: number) {
    const assetConfig = AssetConfig[market]!;
    const positionalValue = price * qty;
    return positionalValue / assetConfig.maxLeverage;
  }

  validateCollateral(user: User, order: OrderEntity) {
    const requiredCollateral = this.computeRequiredCollateral(
      order.market,
      order.price,
      order.qty,
    );

    if (user.getAvailableBalance() < requiredCollateral) {
      throw new InsufficientMarginError();
    }
  }

  reserveOrderCollateral(user: User, order: OrderEntity, qty: number) {
    const requiredCollateral = this.computeRequiredCollateral(
      order.market,
      order.price,
      qty,
    );
    user.lockFunds(requiredCollateral);
  }

  releaseOrderCollateral(user: User, order: OrderEntity, qty: number) {
    const releasedCollateral = this.computeRequiredCollateral(
      order.market,
      order.price,
      qty,
    );
    user.unlockFunds(releasedCollateral);
  }
}
