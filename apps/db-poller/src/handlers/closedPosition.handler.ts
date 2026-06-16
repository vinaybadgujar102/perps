import type z from "zod";
import type { handler } from "../dispatcher";
import { OrderStatus, prisma } from "@repo/database";
import type { closePositionResponseSchema } from "@repo/sharedtypes";

export class ClosePositionEventHandler implements handler {
  async handle(
    event: z.infer<typeof closePositionResponseSchema>,
  ): Promise<void> {
    const { success, order, closedPosition, data: fills, message } = event.data;

    if (!success || !order) {
      if (!success) {
        console.log("Close position failed");
      }
      return;
    }

    try {
      await prisma.order.upsert({
        where: { orderId: order.orderId },
        create: {
          orderId: order.orderId,
          userId: order.userId,
          marketSymbol: order.market,
          side: order.side,
          orderType: order.orderType,
          status: order.status,
          qty: order.qty,
          filledQty: order.filledQty,
          price: order.price,
          placedAt: new Date(order.placedAt),
        },
        update: {},
      });

      if (fills?.length) {
        await prisma.fill.createMany({
          data: fills.map((fill) => ({
            fillId: fill.id,
            marketSymbol: fill.market,
            makerId: fill.makerId,
            takerId: fill.takerId,
            makerOrderId: fill.makerOrderId,
            takerOrderId: fill.takerOrderId,
            price: fill.price,
            filledQty: fill.filledQty,
            makerSide: fill.makerSide,
            takerSide: fill.takerSide,
            filledAt: new Date(fill.timestamp),
          })),
          skipDuplicates: true,
        });
      }

      if (closedPosition) {
        await prisma.closedPosition.upsert({
          where: { positionId: closedPosition.positionId },
          create: {
            positionId: closedPosition.positionId,
            userId: closedPosition.userId,
            marketSymbol: closedPosition.market,
            openingOrderId: closedPosition.openingOrderId,
            side: closedPosition.side,
            size: closedPosition.size,
            averageEntryPrice: closedPosition.averageEntryPrice,
            realizedPnl: closedPosition.realizedPnl,
            openedAt: new Date(closedPosition.openedAt),
            closedAt: new Date(closedPosition.closedAt),
          },
          update: {},
        });
      }
    } catch (error) {
      console.error("Failed to persist close position event", error);
    }
  }
}
