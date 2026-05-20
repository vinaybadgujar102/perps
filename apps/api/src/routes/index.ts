import { Router } from "express";
import authRouter from "./auth.router";
import { createClient } from "redis";
import orderRouter from "./order.route";

export const redis = await createClient().connect();

const appRouter = Router();

appRouter.use("/auth", authRouter);
appRouter.use("/order", orderRouter);

export default appRouter;
