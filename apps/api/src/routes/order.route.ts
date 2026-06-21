import { Router, type Request, type Response } from "express";
import { schemaValidator } from "../validators";
import {
  cancelOrderParamsSchema,
  cancelOrderPayloadSchema,
  createOrderPayloadSchema,
  createOrderSchema,
  EVENT_KINDS,
  ORDER_STATUS,
  ORDER_TYPE,
  SIDE,
} from "@repo/sharedtypes";
import type z from "zod";
import { prisma } from "@repo/database";
import { StatusCodes } from "http-status-codes";
import { isUser } from "../middlewares/user.middleware";
import { dispatchToEngine } from "../utils/dispatchToEngine";
import { errorResponse, successResponse } from "../utils/responseUtils";

const orderRouter = Router();

orderRouter.get("/history", isUser, async (req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.userId },
    orderBy: { placedAt: "desc" },
    take: 100,
  });

  return successResponse(
    res,
    StatusCodes.OK,
    {
      orders: orders.map((order) => ({
        orderId: order.orderId,
        userId: order.userId,
        market: order.marketSymbol,
        side: order.side as SIDE,
        orderType: order.orderType as ORDER_TYPE,
        qty: order.qty,
        filledQty: order.filledQty,
        price: order.price,
        leverage: order.leverage,
        status: order.status as ORDER_STATUS,
        placedAt: order.placedAt.getTime(),
      })),
    },
    "Order history loaded successfully.",
  );
});

orderRouter.get("/", isUser, async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();

  const payload = {
    requestId,
    kind: EVENT_KINDS.GET_OPEN_ORDERS,
    payload: {
      userId: req.user.userId,
    },
  };

  try {
    const response = await dispatchToEngine(payload, requestId);
    return successResponse(
      res,
      StatusCodes.OK,
      response,
      "Open orders loaded successfully.",
    );
  } catch {
    return errorResponse(
      res,
      StatusCodes.GATEWAY_TIMEOUT,
      "Request timed out. Please try again.",
    );
  }
});

orderRouter.post(
  "/",
  isUser,
  schemaValidator(createOrderSchema),
  async (req: Request, res: Response) => {
    const data = req.body as z.infer<typeof createOrderSchema>;
    const requestId = crypto.randomUUID();
    const payload: z.infer<typeof createOrderPayloadSchema> = {
      requestId,
      kind: EVENT_KINDS.CREATE_ORDER,
      userId: req.user.userId,
      payload: {
        id: crypto.randomUUID(),
        ...data,
      },
    };

    try {
      const response = await dispatchToEngine(payload, requestId);
      return successResponse(
        res,
        StatusCodes.OK,
        response,
        "Order submitted successfully.",
      );
    } catch {
      return errorResponse(
        res,
        StatusCodes.GATEWAY_TIMEOUT,
        "Request timed out. Please try again.",
      );
    }
  },
);

orderRouter.delete(
  "/:orderId",
  isUser,
  schemaValidator(cancelOrderParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { orderId } = req.params as z.infer<typeof cancelOrderParamsSchema>;
    const requestId = crypto.randomUUID();

    const payload: z.infer<typeof cancelOrderPayloadSchema> = {
      requestId,
      kind: EVENT_KINDS.CANCEL_ORDER,
      userId: req.user.userId,
      payload: {
        orderId,
      },
    };

    try {
      const response = await dispatchToEngine(payload, requestId);
      return successResponse(
        res,
        StatusCodes.OK,
        response,
        "Order cancelled successfully.",
      );
    } catch {
      return errorResponse(
        res,
        StatusCodes.GATEWAY_TIMEOUT,
        "Request timed out. Please try again.",
      );
    }
  },
);

export default orderRouter;
