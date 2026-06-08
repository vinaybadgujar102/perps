import type z from "zod";
import { type createOrderPayloadSchema } from "@repo/sharedtypes";
import type { UserManager } from "../utils/UserManager.class";
import { Orderbook } from "../inMemoryStates";
import { createPosition } from "../entity/position.util";
import type { MatchingEngineService } from "./matchingEngineService";
import type { RiskService } from "./risk.service";
import { OrderEntity } from "../entity/order.entity";
import type { Fill } from "../types";

export class OrderService {
  constructor(
    private userManager: UserManager,
    private riskService: RiskService,
    private matchingEngineService: MatchingEngineService,
    private orderBook: Orderbook,
  ) {}

  createOrder(event: z.infer<typeof createOrderPayloadSchema>): Fill[] {
    const user = this.userManager.getUser(event.userId);

    // create order object
    const order = new OrderEntity(event.payload, event.userId);
    // see if user has avialabe funds to open this order
    this.riskService.validateCollateral(user, order);
    // do matching
    const fills = this.matchingEngineService.matchOrder(order);

    // add in orderbook
    if (order.getAvailableQty() && order.isLimitOrder()) {
      this.orderBook.addOrder(order);
    }

    // if no matches then no positions created so return
    if (fills.length === 0) {
      // send respose
      return fills;
    }

    // create positions
    for (const fill of fills) {
      createPosition({
        userId: fill.takerId,
        orderId: fill.takerOrderId,
        market: fill.market,
        side: fill.takerSide,
        filledQty: fill.filledQty,
        fillPrice: fill.price,
      });

      createPosition({
        userId: fill.makerId,
        orderId: fill.makerOrderId,
        market: fill.market,
        side: fill.makerSide,
        filledQty: fill.filledQty,
        fillPrice: fill.price,
      });
    }

    return fills;
  }
}
