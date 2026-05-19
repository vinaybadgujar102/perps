import { z } from "zod";

export const signupValidator = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
});
