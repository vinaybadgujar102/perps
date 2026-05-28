import { EVENT_KINDS, QUEUES } from "@repo/sharedtypes";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import type z from "zod";
import { requestMap } from "..";
import { redis } from ".";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { schemaValidator } from "../validators";
import { getOrderbookParamsSchema } from "../validators/orderbook.validator";

const orderbookRouter = Router();

orderbookRouter.get(
  "/:market",
  schemaValidator(getOrderbookParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { market } = req.params as z.infer<typeof getOrderbookParamsSchema>;
    const requestId = crypto.randomUUID();

    try {
      await redis.xAdd(QUEUES.SEND_QUEUE, "*", {
        data: JSON.stringify({
          requestId,
          kind: EVENT_KINDS.GET_ORDERBOOK,
          payload: {
            market,
          },
        }),
      });

      const promise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          requestMap.delete(requestId);
          reject(new Error("Request timed out"));
        }, 10000);

        requestMap.set(requestId, {
          timeoutId,
          resolve,
          reject,
        });
      });

      const data = await promise;
      return successResponse(res, StatusCodes.OK, data);
    } catch {
      return errorResponse(res, StatusCodes.GATEWAY_TIMEOUT, "REQUEST_FAILED");
    }
  },
);

export default orderbookRouter;
