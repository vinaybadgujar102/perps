import type z from "zod";
import {
  ORDER_TYPE,
  SIDE,
  type createOrderPayloadSchema,
  type Position,
} from "@repo/sharedtypes";
import type { UserManager } from "../utils/UserManager.class";
import { OrderbookManager } from "../inMemoryStates";
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
    private orderBookManager: OrderbookManager,
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
      const orderbook = this.orderBookManager.getOrderbook(order.market);
      orderbook.addOrder(order);
    }

    this.applyFills(fills);
    return fills;
  }

  liquidatePosition(position: Position, indexPrice: number): Fill[] {
    const isLong = position.size > 0;
    const order = new OrderEntity(
      {
        id: crypto.randomUUID(),
        market: position.market,
        side: isLong ? SIDE.SHORT : SIDE.LONG,
        qty: Math.abs(position.size),
        orderType: ORDER_TYPE.MARKET_ORDER,
        price: indexPrice,
      },
      position.userId,
    );

    const fills = this.matchingEngineService.matchOrder(order);
    this.applyFills(fills);
    return fills;
  }

   applyFills(fills: Fill[]): void {
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
  }
}
