import { Router } from "express";
import authRouter from "./auth.router";
import { createClient } from "redis";
import orderRouter from "./order.route";
import marketRouter from "./market.route";
import accountRouter from "./account.route";

export const redis = await createClient().connect();

const appRouter = Router();

appRouter.use("/auth", authRouter);
appRouter.use("/order", orderRouter);
appRouter.use("/account", accountRouter);
appRouter.use("/", marketRouter);

export default appRouter;
