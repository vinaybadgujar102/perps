import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  message: string;
};

export type AuthUser = {
  id: number;
  email: string;
  name: string;
};

export type LoginDataResult = {
  token: string;
  user: AuthUser;
};

export type SignUpDataResult = Record<string, never>;
