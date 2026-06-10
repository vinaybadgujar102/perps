import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { successResponse } from "../utils/responseUtils";

const pingRouter = Router();

pingRouter.get("/ping", (req: Request, res: Response) => {
  const port = String(req.socket.localPort ?? process.env.PORT ?? "unknown");

  return successResponse(res, StatusCodes.OK, { port });
});

export default pingRouter;
