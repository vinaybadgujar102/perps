import { Router, type Request, type Response } from "express";
import { schemaValidator } from "../validators";
import { createOrderSchema } from "../validators/order.validators";
import type z from "zod";
import { redis } from ".";
import {
  createOrderPayloadSchema,
  EVENT_KINDS,
  QUEUES,
} from "@repo/sharedtypes";
import { requestMap } from "..";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { StatusCodes } from "http-status-codes";

const orderRouter = Router();

orderRouter.post(
  "/",
  schemaValidator(createOrderSchema),
  async (req: Request, res: Response) => {
    const data = req.body as z.infer<typeof createOrderSchema>;
    console.log("[createOrder] API: received request", { body: data });

    const requestId = crypto.randomUUID();
    const payload: z.infer<typeof createOrderPayloadSchema> = {
      requestId,
      kind: EVENT_KINDS.CREATE_ORDER,
      userId: 1,
      payload: {
        id: crypto.randomUUID(),
        ...data,
      },
    };
    console.log("[createOrder] API: built payload", { requestId, payload });

    try {
      await redis.xAdd(QUEUES.SEND_QUEUE, "*", {
        data: JSON.stringify(payload),
      });
      console.log("[createOrder] API: published to SEND_QUEUE", {
        requestId,
        queue: QUEUES.SEND_QUEUE,
      });

      const response = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          requestMap.delete(requestId);
          reject(new Error("Request timed out"));
        }, 10000);
        requestMap.set(requestId, {
          timeoutId,
          resolve,
          reject,
        });
        console.log("[createOrder] API: registered pending request", {
          requestId,
          pendingCount: requestMap.size,
        });
      });

      return successResponse(res, StatusCodes.OK, response);
    } catch (error) {
      console.error("[createOrder] API: failed", { requestId, error });
      return errorResponse(res, StatusCodes.GATEWAY_TIMEOUT, "REQUEST_FAILED");
    }
  },
);

export default orderRouter;
