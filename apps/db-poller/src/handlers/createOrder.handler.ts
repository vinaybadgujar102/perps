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
      await prisma.$transaction(async (tx) => {
        const existingOrder = await tx.order.findFirst({
          where: { orderId: order.orderId },
        });

        if (existingOrder) {
          console.log(`Order ${order.orderId} already present, skipping`);
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
            console.log(`Fill ${fill.id} already present, skipping`);
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
      });
    } catch (error) {
      console.error("Failed to persist create order event", error);
    }
  }
}
