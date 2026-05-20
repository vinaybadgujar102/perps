import { Router } from "express";
import authRouter from "./auth.router";
import { createClient } from "redis";

export const redis = await createClient().connect();

const appRouter = Router();

appRouter.use("/auth", authRouter);

export default appRouter;
