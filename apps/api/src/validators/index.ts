import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodType } from "zod";
import { errorResponse } from "../utils/responseUtils";

export const schemaValidator = (
  schema: ZodType,
  target: "body" | "params" | "query" = "body",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target]);
      (req as any)[target] = parsed;
      next();
    } catch {
      console.log("Schema Validator Error");
      return errorResponse(res, StatusCodes.BAD_REQUEST, "INVALID_REQUEST");
    }
  };
};
