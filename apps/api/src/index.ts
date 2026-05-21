import express from "express";
import CONSTANTS from "./constants";
import appRouter from "./routes";
import { listenForRequestId } from "./worker";

export const requestMap = new Map();

const app = express();

app.use(express.json());

app.use("/api/v1", appRouter);

app.listen(CONSTANTS.PORT, () => {
  console.log(`Server listening on port ${CONSTANTS.PORT}`);
});

listenForRequestId();
