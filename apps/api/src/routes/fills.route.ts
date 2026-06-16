import { prisma } from "@repo/database";
import { SIDE } from "@repo/sharedtypes";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { isUser } from "../middlewares/user.middleware";
import { successResponse } from "../utils/responseUtils";

const fillsRouter = Router();

fillsRouter.get("/", isUser, async (req: Request, res: Response) => {
  const userId = req.user.userId;

  const fills = await prisma.fill.findMany({
    where: {
      OR: [{ makerId: userId }, { takerId: userId }],
    },
    take: 50,
  });

  return successResponse(
    res,
    StatusCodes.OK,
    {
      fills: fills.map((fill) => ({
        id: fill.fillId,
        market: fill.marketSymbol,
        makerId: fill.makerId,
        takerId: fill.takerId,
        price: fill.price,
        makerOrderId: fill.makerOrderId,
        takerOrderId: fill.takerOrderId,
        filledQty: fill.filledQty,
        takerSide: fill.takerSide as SIDE,
        makerSide: fill.makerSide as SIDE,
        timestamp: fill.filledAt.toISOString(),
      })),
    },
    "Fills loaded successfully.",
  );
});

export default fillsRouter;
