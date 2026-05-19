import express, { type Request, type Response } from "express";
import CONSTANTS from "./constants";
import { schemaValidator } from "./validators";
import { signupValidator } from "./validators/auth.validator";
const app = express();

app.post(
  "/api/v1/signup",
  schemaValidator(signupValidator),
  (req: Request, res: Response) => {
    try {
    } catch (e) {
      throw new Error("INTERNAL_SERVER_ERROR");
    }
  },
);

app.listen(CONSTANTS.PORT, () => {
  console.log(`Server listening on port ${CONSTANTS.PORT}`);
});
