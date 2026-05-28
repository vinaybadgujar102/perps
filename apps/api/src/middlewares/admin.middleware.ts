import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { errorResponse } from "../utils/responseUtils";

export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const expectedSecret = process.env.ADMIN_API_SECRET;
  const providedSecret = req.header("x-admin-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return errorResponse(res, StatusCodes.UNAUTHORIZED, "UNAUTHORIZED_ADMIN");
  }

  return next();
};
