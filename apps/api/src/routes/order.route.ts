import { Router, type Request, type Response } from "express";
import { schemaValidator } from "../validators";
import {
  createOrderPayloadSchema,
  createOrderSchema,
  EVENT_KINDS,
  QUEUES,
} from "@repo/sharedtypes";
import type z from "zod";
import { requestMap } from "..";
import { redis } from ".";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { StatusCodes } from "http-status-codes";
import { isUser } from "../middlewares/user.middleware";

const orderRouter = Router();

orderRouter.post(
  "/",
  isUser,
  schemaValidator(createOrderSchema),
  async (req: Request, res: Response) => {
    const data = req.body as z.infer<typeof createOrderSchema>;
    const authUser = (res as Response & { user?: { userId: number } }).user;

    if (!authUser?.userId) {
      return errorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "Please sign in to continue.",
      );
    }

    const requestId = crypto.randomUUID();
    const payload: z.infer<typeof createOrderPayloadSchema> = {
      requestId,
      kind: EVENT_KINDS.CREATE_ORDER,
      userId: authUser.userId,
      payload: {
        id: crypto.randomUUID(),
        ...data,
      },
    };

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

      return successResponse(
        res,
        StatusCodes.OK,
        response,
        "Order submitted successfully.",
      );
    } catch (error) {
      return errorResponse(
        res,
        StatusCodes.GATEWAY_TIMEOUT,
        "Request timed out. Please try again.",
      );
    }
  },
);

export default orderRouter;
