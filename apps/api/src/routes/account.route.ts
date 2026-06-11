import { EVENT_KINDS, getAccountParamsSchema, QUEUES } from "@repo/sharedtypes";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import type z from "zod";
import { requestMap } from "..";
import { isUser } from "../middlewares/user.middleware";
import { redis } from ".";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { schemaValidator } from "../validators";

const accountRouter = Router();

accountRouter.get(
  "/:userId",
  isUser,
  schemaValidator(getAccountParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const authUser = (res as Response & { user?: { userId: number } }).user;
    if (!authUser?.userId) {
      return errorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "Please sign in to continue.",
      );
    }

    const { userId: requestedUserId } = req.params as z.infer<
      typeof getAccountParamsSchema
    >;
    if (requestedUserId !== authUser.userId) {
      return errorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "You do not have permission to view this account.",
      );
    }

    const requestId = crypto.randomUUID();
    try {
      await redis.xAdd(QUEUES.SEND_QUEUE, "*", {
        data: JSON.stringify({
          requestId,
          kind: EVENT_KINDS.GET_ACCOUNT_STATE,
          payload: {
            userId: requestedUserId,
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
        "Account loaded successfully.",
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

export default accountRouter;
