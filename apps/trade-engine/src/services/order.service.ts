import type z from "zod";
import {
  ORDER_TYPE,
  SIDE,
  type cancelOrderPayloadSchema,
  type createOrderPayloadSchema,
  type Position,
} from "@repo/sharedtypes";
import { OrderNotFoundError } from "../errors";
import type { UserManager } from "../utils/UserManager.class";
import { OrderbookManager } from "../inMemoryStates";
import { createPosition } from "../entity/position.util";
import type { MatchingEngineService } from "./matchingEngineService";
import type { RiskService } from "./risk.service";
import { OrderEntity } from "../entity/order.entity";
import type { Fill } from "../types";
import type { DepthDelta } from "../orderbook.types";
import { DepthDeltaCollector } from "../utils/depth-delta.util";

export type CreateOrderResult = {
  fills: Fill[];
  depthDelta: DepthDelta;
};

export type CancelOrderResult = {
  orderId: string;
  market: string;
  cancelledQty: number;
  depthDelta: DepthDelta;
};

export class OrderService {
  constructor(
    private userManager: UserManager,
    private riskService: RiskService,
    private matchingEngineService: MatchingEngineService,
    private orderBookManager: OrderbookManager,
  ) {}

  createOrder(event: z.infer<typeof createOrderPayloadSchema>): CreateOrderResult {
    const user = this.userManager.getUser(event.userId);

    const order = new OrderEntity(event.payload, event.userId);
    this.riskService.validateCollateral(user, order);

    const { fills, depthDelta: matchDelta } =
      this.matchingEngineService.matchOrder(order);

    const depthDelta = new DepthDeltaCollector();
    depthDelta.merge(matchDelta);

    if (order.getAvailableQty() && order.isLimitOrder()) {
      const orderbook = this.orderBookManager.getOrderbook(order.market);
      const addDelta = orderbook.addOrder(order);
      depthDelta.mergeSide(addDelta.side, {
        price: addDelta.price,
        qty: addDelta.qty,
      });
      user.addOpenOrder(order);
    }

    this.applyFills(fills);
    return { fills, depthDelta: depthDelta.toDelta() };
  }

  cancelOrder(
    event: z.infer<typeof cancelOrderPayloadSchema>,
  ): CancelOrderResult {
    const user = this.userManager.getUser(event.userId);
    const openOrder = user.getOpenOrder(event.payload.orderId);

    if (!openOrder) {
      throw new OrderNotFoundError(event.payload.orderId);
    }

    const orderbook = this.orderBookManager.getOrderbook(openOrder.market);
    const removeResult = orderbook.removeOrderById(
      event.payload.orderId,
      event.userId,
    );

    user.removeOpenOrder(event.payload.orderId);

    const depthDelta = new DepthDeltaCollector();
    depthDelta.mergeSide(removeResult.side, {
      price: removeResult.price,
      qty: removeResult.qty,
    });

    return {
      orderId: event.payload.orderId,
      market: openOrder.market,
      cancelledQty: removeResult.cancelledQty,
      depthDelta: depthDelta.toDelta(),
    };
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

    const { fills } = this.matchingEngineService.matchOrder(order);
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

      // remove the filled order from maker user's open orders
      const makerUser = this.userManager.getUser(fill.makerId);
      const makerOrder = makerUser.getOpenOrder(fill.makerOrderId);
      if (makerOrder?.isOrderFullyFilled()) {
        makerUser.removeOpenOrder(fill.makerOrderId);
      }
    }
  }
}
