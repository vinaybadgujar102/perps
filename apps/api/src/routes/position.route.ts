import { EVENT_KINDS, QUEUES } from "@repo/sharedtypes";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { requestMap } from "..";
import { isUser } from "../middlewares/user.middleware";
import { redis } from ".";
import { errorResponse, successResponse } from "../utils/responseUtils";

const positionRouter = Router();

positionRouter.get("/", isUser, async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();

  try {
    await redis.xAdd(QUEUES.SEND_QUEUE, "*", {
      data: JSON.stringify({
        requestId,
        kind: EVENT_KINDS.GET_OPEN_POSITIONS,
        payload: {
          userId: req.user.userId,
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

export default positionRouter;
