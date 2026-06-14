import {
  EVENT_KINDS,
  onrampDepositSchema,
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
import { schemaValidator } from "../validators";

type CreateOrderResponse = Extract<
  TradeEngineResponse,
  { kind: RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE }
>;

type CreateOrderResponsePayload = CreateOrderResponse["data"];

const onrampRouter = Router();

onrampRouter.post(
  "/",
  isUser,
  schemaValidator(onrampDepositSchema),
  async (req: Request, res: Response) => {
    const { amountUsd } = req.body as z.infer<typeof onrampDepositSchema>;
    const requestId = crypto.randomUUID();
    const onrampId = crypto.randomUUID();

    try {
      await redis.xAdd(QUEUES.SEND_QUEUE, "*", {
        data: JSON.stringify({
          requestId,
          kind: EVENT_KINDS.CREDIT_BALANCE,
          payload: {
            userId: req.user.userId,
            amountUsd,
            onrampId,
          },
        }),
      });

      const engineResponse = await new Promise<CreateOrderResponsePayload>(
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

      if (!engineResponse.success || !engineResponse.data) {
        return errorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          engineResponse.message ?? "Deposit failed. Please try again.",
        );
      }

      return successResponse(
        res,
        StatusCodes.OK,
        {
          onrampId: engineResponse.data.onrampId,
          amountUsd,
          balanceUsd: engineResponse.data.balanceUsd,
          availableMarginUsd: engineResponse.data.availableMarginUsd,
        },
        "Deposit completed successfully.",
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

export default onrampRouter;
