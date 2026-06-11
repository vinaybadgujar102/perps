import type { Response } from "express";
import type { StatusCodes } from "http-status-codes";

export const successResponse = <T>(
  res: Response,
  statusCode: StatusCodes,
  data: T,
  message: string,
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

export const errorResponse = (
  res: Response,
  statusCode: StatusCodes,
  message: string,
) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
  });
};
