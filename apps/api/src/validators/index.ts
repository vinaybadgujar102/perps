import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z, ZodAny, ZodError, ZodType } from "zod";
import { errorResponse } from "../utils/responseUtils";

export const schemaValidator = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (e) {
      return errorResponse(res, StatusCodes.UNAUTHORIZED, "UNAUTHORIZED");
    }
  };
};
