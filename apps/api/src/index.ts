import express from "express";
import CONSTANTS from "./constants";
import appRouter from "./routes";
import { listenForRequestId } from "./worker";
import { bootstrapMarkets } from "./bootstrap/market.bootstrap";

export const requestMap = new Map();

const app = express();

app.use(express.json());

app.use("/api/v1", appRouter);

app.listen(CONSTANTS.PORT, () => {
  console.log(`Server listening on port ${CONSTANTS.PORT}`);
});

bootstrapMarkets().catch((error) => {
  console.error("Failed to bootstrap default markets", error);
});

listenForRequestId();
