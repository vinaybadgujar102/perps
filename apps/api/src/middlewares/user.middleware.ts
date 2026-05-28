import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/responseUtils";

type AuthPayload = {
  userId: number;
};

export const isUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.header("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    return errorResponse(res, StatusCodes.UNAUTHORIZED, "UNAUTHORIZED_USER");
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;

    if (!decoded?.userId) {
      return errorResponse(res, StatusCodes.UNAUTHORIZED, "UNAUTHORIZED_USER");
    }

    (res as Response & { user?: AuthPayload }).user = {
      userId: decoded.userId,
    };
    next();
  } catch {
    return errorResponse(res, StatusCodes.UNAUTHORIZED, "UNAUTHORIZED_USER");
  }

};
