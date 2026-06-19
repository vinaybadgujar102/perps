import crypto from "crypto";
import {
  BASE_CURRENCY_SCALE_FACTOR,
  EVENT_KINDS,
  onRampCaptureSchema,
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
import { PaymentStatus, prisma } from "@repo/database";

type CreateOrderResponse = Extract<
  TradeEngineResponse,
  { kind: RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE }
>;

type CreateOrderResponsePayload = CreateOrderResponse["data"];

const onrampRouter = Router();

// creates paymnet object
onrampRouter.post(
  "/createPaymentOrder",
  isUser,
  schemaValidator(onrampDepositSchema), // we only recieve the amount from the user
  async (req, res) => {
    const { amountUsd } = req.body as z.infer<typeof onrampDepositSchema>;

    try {
      const order = await razorpayInstance.orders.create({
        amount: amountUsd * 100,
        currency: "USD",
      });

      if (!order) {
        return errorResponse(
          res,
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Couldnt create order",
        );
      }

      await prisma.payment.create({
        data: {
          orderId: order.id,
          status: PaymentStatus.CREATED,
          amount: Number(order.amount),
          userId: req.user.userId,
        },
      });

      return successResponse(res, StatusCodes.OK, order, "Order created");
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

onrampRouter.post(
  "/capturePayment",
  isUser,
  schemaValidator(onRampCaptureSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof onRampCaptureSchema>;

    try {
      const existingPayment = await prisma.payment.findUnique({
        where: {
          orderId: body.orderId,
        },
        select: {
          status: true,
          amount: true,
          userId: true,
        },
      });

      if (!existingPayment) {
        return errorResponse(res, StatusCodes.NOT_FOUND, "Payment not found");
      }

      if (existingPayment.userId !== req.user.userId) {
        return errorResponse(
          res,
          StatusCodes.FORBIDDEN,
          "Payment does not belong to this user",
        );
      }

      // Idempotency check
      if (existingPayment.status === PaymentStatus.SUCCESS) {
        return successResponse(
          res,
          StatusCodes.OK,
          {},
          "Payment already processed",
        );
      }

      // Payment failed on Razorpay side
      if (body.status !== "success") {
        await prisma.payment.update({
          where: {
            orderId: body.orderId,
          },
          data: {
            paymentId: body.paymentId,
            status: PaymentStatus.FAILED,
          },
        });

        return errorResponse(res, StatusCodes.BAD_REQUEST, "Payment failed");
      }

      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_TEST_SECRET_KEY!)
        .update(`${body.orderId}|${body.paymentId}`)
        .digest("hex");

      // Signature verification failed
      if (generatedSignature !== body.signature) {
        await prisma.payment.update({
          where: {
            orderId: body.orderId,
          },
          data: {
            paymentId: body.paymentId,
            status: PaymentStatus.FAILED,
          },
        });

        return errorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Invalid payment signature",
        );
      }

      const scaledAmountUsd = existingPayment.amount;

      const requestId = crypto.randomUUID();
      const onrampId = crypto.randomUUID();

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

      await prisma.payment.update({
        where: {
          orderId: body.orderId,
        },
        data: {
          paymentId: body.paymentId,
          status: PaymentStatus.SUCCESS,
        },
      });

      const displayAmountUsd =
        existingPayment.amount / BASE_CURRENCY_SCALE_FACTOR;

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
    } catch (error) {
      console.error(error);

      return errorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to process payment",
      );
    }
  },
);
export default onrampRouter;
