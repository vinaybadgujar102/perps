import {
  closePositionParamsSchema,
  closePositionPayloadSchema,
  EVENT_KINDS,
  SIDE,
} from "@repo/sharedtypes";
import { prisma } from "@repo/database";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import type z from "zod";
import { isUser } from "../middlewares/user.middleware";
import { dispatchToEngine } from "../utils/dispatchToEngine";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { toDisplayCollateral, toDisplayPnl } from "../utils/scaling";
import { schemaValidator } from "../validators";

const positionRouter = Router();

positionRouter.get("/closed", isUser, async (req: Request, res: Response) => {
  const closedPositions = await prisma.closedPosition.findMany({
    where: { userId: req.user.userId },
    orderBy: { closedAt: "desc" },
    take: 100,
  });

  return successResponse(
    res,
    StatusCodes.OK,
    {
      closedPositions: closedPositions.map((position) => ({
        positionId: position.positionId,
        userId: position.userId,
        market: position.marketSymbol,
        openingOrderId: position.openingOrderId,
        side: position.side as SIDE,
        size: position.size,
        averageEntryPrice: position.averageEntryPrice,
        realizedPnl: toDisplayPnl(position.realizedPnl, position.marketSymbol),
        openedAt: position.openedAt.getTime(),
        closedAt: position.closedAt.getTime(),
      })),
    },
    "Closed positions loaded successfully.",
  );
});

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

    const clientData =
      data.success && data.data
        ? {
            ...data,
            data: data.data.map((position) => ({
              ...position,
              collateralUser: toDisplayCollateral(
                position.collateralUser,
                position.market,
              ),
              realizedPnl: toDisplayPnl(position.realizedPnl, position.market),
            })),
          }
        : data;

    return successResponse(
      res,
      StatusCodes.OK,
      clientData,
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
  schemaValidator(closePositionParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { market } = req.params as z.infer<typeof closePositionParamsSchema>;
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
