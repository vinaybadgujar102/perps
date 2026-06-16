import type z from "zod";
import type { handler } from "../dispatcher";
import { OrderStatus, prisma } from "@repo/database";
import type { createOrderResponseSchema } from "@repo/sharedtypes";

export class CreateOrderEventHandler implements handler {
  async handle(
    event: z.infer<typeof createOrderResponseSchema>,
  ): Promise<void> {
    const { success, order, data: fills, message } = event.data;

    if (!success || !order) {
      if (!success) {
        console.log(`Create order failed`);
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
    } catch (error) {
      console.error("Failed to persist create order event", error);
    }
  }
}
