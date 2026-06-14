import type z from "zod";
import {
  ORDER_TYPE,
  SIDE,
  type cancelOrderPayloadSchema,
  type closePositionPayloadSchema,
  type createOrderPayloadSchema,
  type Position,
} from "@repo/sharedtypes";
import { OrderNotFoundError, PositionNotFoundError } from "../errors";
import type { UserManager } from "../utils/UserManager.class";
import { OrderbookManager, POSITIONS } from "../inMemoryStates";
import { createPosition, generatePositionKey } from "../entity/position.util";
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

export type ClosePositionResult = {
  fills: Fill[];
  depthDelta: DepthDelta;
  market: string;
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

    // if order is limit order and has available quantity
    // reserve collateral and add the order to orderbook
    if (order.getAvailableQty() && order.isLimitOrder()) {
      this.riskService.reserveOrderCollateral(
        user,
        order,
        order.getAvailableQty(),
      );

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

    this.riskService.releaseOrderCollateral(
      user,
      openOrder,
      removeResult.cancelledQty,
    );

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

  closePosition(
    event: z.infer<typeof closePositionPayloadSchema>,
  ): ClosePositionResult {
    const { userId, payload } = event;
    const positionKey = generatePositionKey(userId.toString(), payload.market);
    const position = POSITIONS.get(positionKey);

    if (!position || position.userId !== userId) {
      throw new PositionNotFoundError(payload.market);
    }

    const orderbook = this.orderBookManager.getOrderbook(payload.market);
    const indexPrice = orderbook.getIndexPrice();
    const { fills, depthDelta } = this.executeMarketCloseOrder(
      position,
      indexPrice,
    );

    return { fills, depthDelta, market: payload.market };
  }

  liquidatePosition(
    position: Position,
    indexPrice: number,
  ): { fills: Fill[]; depthDelta: DepthDelta } {
    return this.executeMarketCloseOrder(position, indexPrice);
  }

  private executeMarketCloseOrder(
    position: Position,
    indexPrice: number,
  ): { fills: Fill[]; depthDelta: DepthDelta } {
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

    const { fills, depthDelta } = this.matchingEngineService.matchOrder(order);
    this.applyFills(fills);
    return { fills, depthDelta };
  }

  applyFills(fills: Fill[]): void {
    for (const fill of fills) {
      const orderbook = this.orderBookManager.getOrderbook(fill.market);
      orderbook.setLastTradedPrice(fill.price);

      const makerUser = this.userManager.getUser(fill.makerId);
      const makerOrder = makerUser.getOpenOrder(fill.makerOrderId);
      if (makerOrder) {
        this.riskService.releaseOrderCollateral(
          makerUser,
          makerOrder,
          fill.filledQty,
        );
      }

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

      if (makerOrder?.isOrderFullyFilled()) {
        makerUser.removeOpenOrder(fill.makerOrderId);
      }
    }
  }
}
