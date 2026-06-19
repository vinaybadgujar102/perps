import {
  EVENT_KINDS,
  getAccountParamsSchema,
  QUEUES,
  RESPONSE_KINDS,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import type z from "zod";
import { requestMap } from "..";
import { isUser } from "../middlewares/user.middleware";
import { redis } from ".";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { toDisplayUsd } from "../utils/scaling";
import { schemaValidator } from "../validators";

type GetAccountStateResponse = Extract<
  TradeEngineResponse,
  { kind: RESPONSE_KINDS.GET_ACCOUNT_STATE_RESPONSE }
>;

type GetAccountStateResponsePayload = GetAccountStateResponse["data"];

const accountRouter = Router();

accountRouter.get(
  "/:userId",
  isUser,
  schemaValidator(getAccountParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { userId: requestedUserId } = req.params as z.infer<
      typeof getAccountParamsSchema
    >;
    if (requestedUserId !== req.user.userId) {
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

      const engineResponse = await new Promise<GetAccountStateResponsePayload>(
        (resolve, reject) => {
          const timeoutId = setTimeout(() => {
            requestMap.delete(requestId);
            reject(new Error("Request timed out"));
          }, 10000);

          requestMap.set(requestId, {
            timeoutId,
            resolve,
            reject,
          });
        },
      );

      const clientData =
        engineResponse.success && engineResponse.data
          ? {
              ...engineResponse,
              data: {
                balanceUsd: toDisplayUsd(engineResponse.data.balanceUsd),
                lockedMarginUsd: toDisplayUsd(
                  engineResponse.data.lockedMarginUsd,
                ),
                availableMarginUsd: toDisplayUsd(
                  engineResponse.data.availableMarginUsd,
                ),
              },
            }
          : engineResponse;

      return successResponse(
        res,
        StatusCodes.OK,
        clientData,
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
