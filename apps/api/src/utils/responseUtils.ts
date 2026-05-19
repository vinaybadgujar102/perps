import type { Response } from "express";
import type { StatusCodes } from "http-status-codes";

export const successResponse = <T>(
  res: Response,
  statusCode: StatusCodes,
  data: T,
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
};

export const errorResponse = (
  res: Response,
  statusCode: StatusCodes,
  errorCode: string,
) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: errorCode,
  });
};
