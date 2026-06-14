import {
  closePositionsParamsSchema,
  closePositionPayloadSchema,
  EVENT_KINDS,
  QUEUES,
} from "@repo/sharedtypes";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import type z from "zod";
import { requestMap } from "..";
import { isUser } from "../middlewares/user.middleware";
import { redis } from ".";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { schemaValidator } from "../validators";

const positionRouter = Router();

async function dispatchToEngine<T>(
  payload: Record<string, unknown>,
  requestId: string,
): Promise<T> {
  await redis.xAdd(QUEUES.SEND_QUEUE, "*", {
    data: JSON.stringify(payload),
  });

  return new Promise((resolve, reject) => {
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
}

positionRouter.get("/", isUser, async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();

  const payload = {
    requestId,
    kind: EVENT_KINDS.GET_OPEN_POSITIONS,
    payload: {
      userId: req.user.userId,
    },
  };

  try {
    const data = await dispatchToEngine(payload, requestId);
    return successResponse(
      res,
      StatusCodes.OK,
      data,
      "Positions loaded successfully.",
    );
  } catch {
    return errorResponse(
      res,
      StatusCodes.GATEWAY_TIMEOUT,
      "Request timed out. Please try again.",
    );
  }
});

positionRouter.post(
  "/:market/close",
  isUser,
  schemaValidator(closePositionsParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { market } = req.params as z.infer<typeof closePositionsParamsSchema>;
    const requestId = crypto.randomUUID();

    const payload: z.infer<typeof closePositionPayloadSchema> = {
      requestId,
      kind: EVENT_KINDS.CLOSE_POSITION,
      userId: req.user.userId,
      payload: {
        market,
      },
    };

    try {
      const response = await dispatchToEngine(payload, requestId);
      return successResponse(
        res,
        StatusCodes.OK,
        response,
        "Position closed successfully.",
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

export default positionRouter;
