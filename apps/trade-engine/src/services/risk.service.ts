import type { OrderEntity } from "../entity/order.entity";
import { InsufficientMarginError } from "../errors";
import type { User } from "../utils/User.class";

export class RiskService {
  computeRequiredCollateral(
    market: string,
    price: number,
    qty: number,
    leverage: number,
  ) {
    const positionalValue = price * qty;
    return positionalValue / leverage;
  }

  validateCollateral(user: User, order: OrderEntity) {
    const requiredCollateral = this.computeRequiredCollateral(
      order.market,
      order.price,
      order.qty,
      order.leverage,
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
      order.leverage,
    );
    user.lockFunds(requiredCollateral);
  }

  releaseOrderCollateral(user: User, order: OrderEntity, qty: number) {
    const releasedCollateral = this.computeRequiredCollateral(
      order.market,
      order.price,
      qty,
      order.leverage,
    );
    user.unlockFunds(releasedCollateral);
  }
}
