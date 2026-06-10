import { prisma } from "@repo/database";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { isAdmin } from "../middlewares/admin.middleware";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { schemaValidator } from "../validators";
import {
  createMarketSchema,
  updateMarketSchema,
} from "@repo/sharedtypes";

const marketRouter = Router();

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

marketRouter.get("/markets", async (_req: Request, res: Response) => {
  const markets = await prisma.market.findMany({
    where: { isActive: true },
    orderBy: { symbol: "asc" },
  });

  return successResponse(res, StatusCodes.OK, { markets });
});

marketRouter.get("/markets/:symbol", async (req: Request, res: Response) => {
  const symbol = normalizeSymbol(req.params.symbol);

  const market = await prisma.market.findUnique({
    where: { symbol },
  });

  if (!market) {
    return errorResponse(res, StatusCodes.NOT_FOUND, "MARKET_NOT_FOUND");
  }

  return successResponse(res, StatusCodes.OK, { market });
});

marketRouter.post(
  "/admin/markets",
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

      return successResponse(res, StatusCodes.CREATED, { market });
    } catch {
      return errorResponse(res, StatusCodes.CONFLICT, "MARKET_ALREADY_EXISTS");
    }
  },
);

marketRouter.put(
  "/admin/markets/:symbol",
  isAdmin,
  schemaValidator(updateMarketSchema),
  async (req: Request, res: Response) => {
    const symbol = normalizeSymbol(req.params.symbol);
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

      return successResponse(res, StatusCodes.OK, { market });
    } catch {
      return errorResponse(res, StatusCodes.NOT_FOUND, "MARKET_NOT_FOUND");
    }
  },
);

marketRouter.delete(
  "/admin/markets/:symbol",
  isAdmin,
  async (req: Request, res: Response) => {
    const symbol = normalizeSymbol(req.params.symbol);

    try {
      const market = await prisma.market.update({
        where: { symbol },
        data: { isActive: false },
      });

      return successResponse(res, StatusCodes.OK, { market });
    } catch {
      return errorResponse(res, StatusCodes.NOT_FOUND, "MARKET_NOT_FOUND");
    }
  },
);

export default marketRouter;
