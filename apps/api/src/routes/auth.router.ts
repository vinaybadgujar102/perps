import { Router, type Request, type Response } from "express";
import { schemaValidator } from "../validators";
import type z from "zod";
import { signUpSchema } from "../validators/auth.validator";
import { prisma } from "@repo/database";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import { redis } from ".";
import { EVENT_KINDS, QUEUES } from "@repo/sharedtypes";
import { requestMap } from "..";
const authRouter = Router();

// also add the user in order engine
authRouter.post(
  "/signup",
  schemaValidator(signUpSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body as z.infer<
        typeof signUpSchema
      >;

      const existingUser = await prisma.user.findFirst({
        where: {
          email,
        },
      });

      if (existingUser) {
        return errorResponse(res, StatusCodes.CONFLICT, "USER_ALREADY_EXISTS");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const createdUser = await prisma.user.create({
        data: {
          password: hashedPassword,
          email,
          name,
        },
        select: {
          id: true,
        },
      });

      const requestId = crypto.randomUUID();

      const promise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          requestMap.delete(requestId);
          reject(new Error("Request Timeout"));
        }, 10000);

        requestMap.set(requestId, {
          resolve,
          reject,
          timeoutId,
        });
      });

      const payload = {
        requestId: requestId,
        kind: EVENT_KINDS.CREATE_USER,
        payload: {
          userId: createdUser.id,
        },
      };

      redis.xAdd(QUEUES.SEND_QUEUE, "*", {
        data: JSON.stringify(payload),
      });

      await promise;

      return successResponse(res, StatusCodes.CREATED, {
        message: "User Successfully Created",
      });
    } catch (e) {
      throw new Error("INTERNAL_SERVER_ERROR");
    }
  },
);

export default authRouter;
