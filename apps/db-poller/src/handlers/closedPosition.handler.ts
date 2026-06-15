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
      await prisma.$transaction(async (tx) => {
        const existingOrder = await tx.order.findFirst({
          where: { orderId: order.orderId },
        });

        if (existingOrder) {
          console.log("Order already present, skipping");
          return;
        }

        await tx.order.create({
          data: {
            orderId: order.orderId,
            userId: order.userId,
            marketSymbol: order.market,
            side: order.side,
            orderType: order.orderType,
            status: order.status as OrderStatus,
            qty: order.qty,
            filledQty: order.filledQty,
            price: order.price,
            placedAt: new Date(order.placedAt),
          },
        });

        for (const fill of fills ?? []) {
          const existingFill = await tx.fill.findUnique({
            where: { fillId: fill.id },
          });

          if (existingFill) {
            console.log("Fill already present, skipping");
            continue;
          }

          await tx.fill.create({
            data: {
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
            },
          });
        }

        if (closedPosition) {
          const existingClosedPosition = await tx.closedPosition.findUnique({
            where: { positionId: closedPosition.positionId },
          });

          if (existingClosedPosition) {
            console.log("Closed position already present, skipping");
          } else {
            await tx.closedPosition.create({
              data: {
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
            });
          }
        }
      });
    } catch (error) {
      console.error("Failed to persist close position event", error);
    }
  }
}
