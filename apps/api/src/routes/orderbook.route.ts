import {
  EVENT_KINDS,
  getOrderbookParamsSchema,
} from "@repo/sharedtypes";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import type z from "zod";
import { dispatchToEngine } from "../utils/dispatchToEngine";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { schemaValidator } from "../validators";

const orderbookRouter = Router();

orderbookRouter.get(
  "/:market",
  schemaValidator(getOrderbookParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { market } = req.params as z.infer<typeof getOrderbookParamsSchema>;
    const requestId = crypto.randomUUID();

    try {
      const data = await dispatchToEngine(
        {
          requestId,
          kind: EVENT_KINDS.GET_ORDERBOOK,
          payload: {
            market,
          },
        },
        requestId,
      );
      return successResponse(
        res,
        StatusCodes.OK,
        data,
        "Orderbook loaded successfully.",
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

export default orderbookRouter;
