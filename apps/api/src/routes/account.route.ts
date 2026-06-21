import {
  EVENT_KINDS,
  getAccountParamsSchema,
} from "@repo/sharedtypes";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import type z from "zod";
import { isUser } from "../middlewares/user.middleware";
import { dispatchToEngine } from "../utils/dispatchToEngine";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { toDisplayUsd } from "../utils/scaling";
import { schemaValidator } from "../validators";

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
      const engineResponse = await dispatchToEngine(
        {
          requestId,
          kind: EVENT_KINDS.GET_ACCOUNT_STATE,
          payload: {
            userId: requestedUserId,
          },
        },
        requestId,
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
