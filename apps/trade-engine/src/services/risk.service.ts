import { AssetConfig } from "@repo/sharedtypes";
import type { OrderEntity } from "../entity/order.entity";
import type { User } from "../utils/User.class";

export class RiskService {
  validateCollateral(user: User, order: OrderEntity) {
    const assetConfig = AssetConfig[order.market]!;
    const maxLeverage = assetConfig.maxLeverage;
    const positionalValue = order.price * order.qty;
    const requiredCollateral = positionalValue / maxLeverage;

    if (user.getAvailableBalance() < requiredCollateral) {
      throw new Error("Insufficient margin");
    }
  }
}
