import {
  BASE_CURRENCY_SCALE_FACTOR,
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
import { razorpayInstance } from "../config/razorpay.config";

type CreateOrderResponse = Extract<
  TradeEngineResponse,
  { kind: RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE }
>;

type CreateOrderResponsePayload = CreateOrderResponse["data"];

const onrampRouter = Router();

onrampRouter.post(
  "/createPaymentOrder",
  isUser,
  schemaValidator(onrampDepositSchema), // we only recieve the amount from the user
  async (req, res) => {
    const body = req.body as z.infer<typeof onrampDepositSchema>;

    try {
      const order = await razorpayInstance.orders.create({
        amount: body.amountUsd * 100,
        currency: "USD",
      });

      if (!order) {
        return errorResponse(
          res,
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Couldnt create order",
        );
      }

      return successResponse(
        res,
        StatusCodes.OK,
        {
          order_id: order.id,
          currency: order.currency,
          amount: order.amount,
        },
        "Order created",
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

onrampRouter.post(
  "/",
  isUser,
  schemaValidator(onrampDepositSchema),
  async (req: Request, res: Response) => {
    const { amountUsd: displayAmountUsd } = req.body as z.infer<
      typeof onrampDepositSchema
    >;
    const scaledAmountUsd = Math.round(
      displayAmountUsd * BASE_CURRENCY_SCALE_FACTOR,
    );
    const requestId = crypto.randomUUID();
    const onrampId = crypto.randomUUID();

    try {
      await redis.xAdd(QUEUES.SEND_QUEUE, "*", {
        data: JSON.stringify({
          requestId,
          kind: EVENT_KINDS.CREDIT_BALANCE,
          payload: {
            userId: req.user.userId,
            amountUsd: scaledAmountUsd,
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
          amountUsd: displayAmountUsd,
          balanceUsd:
            Math.round(
              (engineResponse.data.balanceUsd / BASE_CURRENCY_SCALE_FACTOR) *
                100,
            ) / 100,
          availableMarginUsd:
            Math.round(
              (engineResponse.data.availableMarginUsd /
                BASE_CURRENCY_SCALE_FACTOR) *
                100,
            ) / 100,
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
