import { Router, type Request, type Response } from "express";
import { schemaValidator } from "../validators";
import type z from "zod";
import { loginSchema, signUpSchema, EVENT_KINDS, QUEUES } from "@repo/sharedtypes";
import { prisma } from "@repo/database";
import { errorResponse, successResponse } from "../utils/responseUtils";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { redis } from ".";
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
        return errorResponse(
          res,
          StatusCodes.CONFLICT,
          "An account with this email already exists.",
        );
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
          userId: 1,
        },
      };

      redis.xAdd(QUEUES.SEND_QUEUE, "*", {
        data: JSON.stringify(payload),
      });

      await promise;

      return successResponse(
        res,
        StatusCodes.CREATED,
        null,
        "Your account has been created successfully.",
      );
    } catch (e) {
      throw new Error("INTERNAL_SERVER_ERROR");
    }
  },
);

authRouter.post(
  "/login",
  schemaValidator(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;

      const user = await prisma.user.findFirst({
        where: { email },
      });

      if (!user) {
        return errorResponse(
          res,
          StatusCodes.UNAUTHORIZED,
          "Invalid email or password.",
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return errorResponse(
          res,
          StatusCodes.UNAUTHORIZED,
          "Invalid email or password.",
        );
      }

      const jwtSecret = process.env.JWT_SECRET!;

      const token = jwt.sign({ userId: user.id }, jwtSecret, {
        expiresIn: "7d",
      });

      return successResponse(
        res,
        StatusCodes.OK,
        {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
        "Signed in successfully.",
      );
    } catch {
      throw new Error("INTERNAL_SERVER_ERROR");
    }
  },
);

export default authRouter;
