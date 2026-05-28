import { z } from "zod";
import { apiEnvelopeSchema, post } from "./api-envelope";

const loginInputSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signUpInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const authUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
});

const loginResponseSchema = apiEnvelopeSchema(
  z.object({
    token: z.string(),
    user: authUserSchema,
  }),
);

const signupResponseSchema = apiEnvelopeSchema(
  z.object({
    message: z.string(),
  }),
);

export type LoginInput = z.infer<typeof loginInputSchema>;
export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;

const friendlyErrors: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_ALREADY_EXISTS: "An account with this email already exists",
};

const toFriendlyError = (code: string | null): string =>
  (code && friendlyErrors[code]) || code || "Something went wrong. Please try again.";

export const login = async (input: LoginInput): Promise<{ token: string; user: AuthUser }> => {
  const body = loginInputSchema.parse(input);
  const response = await post("/auth/login", body, loginResponseSchema);

  if (!response.success || !response.data) {
    throw new Error(toFriendlyError(response.error));
  }

  return response.data;
};

export const signup = async (input: SignUpInput): Promise<{ message: string }> => {
  const body = signUpInputSchema.parse(input);
  const response = await post("/auth/signup", body, signupResponseSchema);

  if (!response.success || !response.data) {
    throw new Error(toFriendlyError(response.error));
  }

  return response.data;
};
