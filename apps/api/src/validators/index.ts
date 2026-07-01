import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodType } from "zod";
import { errorResponse } from "../utils/responseUtils";

type ValidatedRequest = Request & {
  validatedQuery?: unknown;
};

function assignValidatedValue(
  req: ValidatedRequest,
  target: "body" | "params" | "query",
  parsed: unknown,
) {
  if (target === "query") {
    req.validatedQuery = parsed;
    return;
  }

  (req as Record<string, unknown>)[target] = parsed;
}

export function getValidatedQuery<T>(req: Request): T {
  return (req as ValidatedRequest).validatedQuery as T;
}

export const schemaValidator = (
  schema: ZodType,
  target: "body" | "params" | "query" = "body",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target]);
      assignValidatedValue(req as ValidatedRequest, target, parsed);
      next();
    } catch (error) {
      console.log("Schema Validator Error", error);
      return errorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Please check your input and try again.",
      );
    }
  };
};
