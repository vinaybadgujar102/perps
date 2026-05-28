import { Router } from "express";
import authRouter from "./auth.router";
import { createClient } from "redis";
import orderRouter from "./order.route";
import marketRouter from "./market.route";
import accountRouter from "./account.route";
import positionRouter from "./position.route";
import orderbookRouter from "./orderbook.route";

export const redis = await createClient().connect();

const appRouter = Router();

appRouter.use("/auth", authRouter);
appRouter.use("/order", orderRouter);
appRouter.use("/account", accountRouter);
appRouter.use("/positions", positionRouter);
appRouter.use("/orderbook", orderbookRouter);
appRouter.use("/", marketRouter);

export default appRouter;
