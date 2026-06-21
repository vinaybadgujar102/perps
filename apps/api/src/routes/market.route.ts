import { prisma } from "@repo/database";
import {
  createMarketSchema,
  marketSymbolParamsSchema,
  updateMarketSchema,
} from "@repo/sharedtypes";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import type z from "zod";
import { isAdmin } from "../middlewares/admin.middleware";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { schemaValidator } from "../validators";

const marketRouter = Router();

marketRouter.get("/", async (_req: Request, res: Response) => {
  const markets = await prisma.market.findMany({
    where: { isActive: true },
    orderBy: { symbol: "asc" },
  });

  return successResponse(
    res,
    StatusCodes.OK,
    { markets },
    "Markets loaded successfully.",
  );
});

marketRouter.post(
  "/admin",
  isAdmin,
  schemaValidator(createMarketSchema),
  async (req: Request, res: Response) => {
    const data = createMarketSchema.parse(req.body);

    try {
      const market = await prisma.market.create({
        data: {
          symbol: data.symbol,
          priceScale: data.priceScale,
          quantityScale: data.quantityScale,
          maxLeverage: data.maxLeverage,
          isActive: data.isActive,
        },
      });

      return successResponse(
        res,
        StatusCodes.CREATED,
        { market },
        "Market created successfully.",
      );
    } catch {
      return errorResponse(
        res,
        StatusCodes.CONFLICT,
        "This market already exists.",
      );
    }
  },
);

marketRouter.put(
  "/admin/:symbol",
  isAdmin,
  schemaValidator(marketSymbolParamsSchema, "params"),
  schemaValidator(updateMarketSchema),
  async (req: Request, res: Response) => {
    const { symbol } = req.params as z.infer<typeof marketSymbolParamsSchema>;
    const data = updateMarketSchema.parse(req.body);

    try {
      const market = await prisma.market.update({
        where: { symbol },
        data: {
          symbol: data.symbol,
          priceScale: data.priceScale,
          quantityScale: data.quantityScale,
          maxLeverage: data.maxLeverage,
          isActive: data.isActive,
        },
      });

      return successResponse(
        res,
        StatusCodes.OK,
        { market },
        "Market updated successfully.",
      );
    } catch {
      return errorResponse(res, StatusCodes.NOT_FOUND, "Market not found.");
    }
  },
);

marketRouter.delete(
  "/admin/:symbol",
  isAdmin,
  schemaValidator(marketSymbolParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { symbol } = req.params as z.infer<typeof marketSymbolParamsSchema>;

    try {
      const market = await prisma.market.update({
        where: { symbol },
        data: { isActive: false },
      });

      return successResponse(
        res,
        StatusCodes.OK,
        { market },
        "Market deactivated successfully.",
      );
    } catch {
      return errorResponse(res, StatusCodes.NOT_FOUND, "Market not found.");
    }
  },
);

marketRouter.get(
  "/:symbol",
  schemaValidator(marketSymbolParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { symbol } = req.params as z.infer<typeof marketSymbolParamsSchema>;

    const market = await prisma.market.findUnique({
      where: { symbol },
    });

    if (!market) {
      return errorResponse(res, StatusCodes.NOT_FOUND, "Market not found.");
    }

    return successResponse(
      res,
      StatusCodes.OK,
      { market },
      "Market loaded successfully.",
    );
  },
);

export default marketRouter;
