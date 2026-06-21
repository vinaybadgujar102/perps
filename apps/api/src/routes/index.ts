import { Router } from "express";
import authRouter from "./auth.router";
import orderRouter from "./order.route";
import marketRouter from "./market.route";
import accountRouter from "./account.route";
import positionRouter from "./position.route";
import orderbookRouter from "./orderbook.route";
import onrampRouter from "./onramp.route";
import depositsRouter from "./deposits.route";
import fillsRouter from "./fills.route";
import pingRouter from "./ping.route";

const appRouter = Router();

appRouter.use("/fills", fillsRouter);
appRouter.use("/", pingRouter);
appRouter.use("/auth", authRouter);
appRouter.use("/order", orderRouter);
appRouter.use("/account", accountRouter);
appRouter.use("/positions", positionRouter);
appRouter.use("/orderbook", orderbookRouter);
appRouter.use("/onramp", onrampRouter);
appRouter.use("/deposits", depositsRouter);
appRouter.use("/market", marketRouter);

export default appRouter;
