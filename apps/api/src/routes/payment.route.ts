import { Router } from "express";
import { isUser } from "../middlewares/user.middleware";
import { prisma } from "@repo/database";

export const paymentRouter = Router();

paymentRouter.post("/", isUser, async (req, res) => {
  const payload = req.body;

  const payment = await prisma.payment.create({
    data: {
      orderId: payload.orderId,
      amount: payload.amount,
    },
  }
});
