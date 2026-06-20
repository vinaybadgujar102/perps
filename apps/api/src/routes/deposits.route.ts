import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "@repo/database";
import { isUser } from "../middlewares/user.middleware";
import { successResponse } from "../utils/responseUtils";
import { fromPaymentCents, toDisplayUsd } from "../utils/scaling";

const depositsRouter = Router();

depositsRouter.get("/", isUser, async (req: Request, res: Response) => {
  const payments = await prisma.payment.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return successResponse(
    res,
    StatusCodes.OK,
    {
      deposits: payments.map((payment) => ({
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        status: payment.status,
        amountUsd: toDisplayUsd(fromPaymentCents(payment.amount)),
        createdAt: payment.createdAt.getTime(),
      })),
    },
    "Deposit history loaded successfully.",
  );
});

export default depositsRouter;
