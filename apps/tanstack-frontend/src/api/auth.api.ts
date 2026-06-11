import type { LoginInput, SignUpInput } from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";

export async function loginApi(payload: LoginInput) {
  const result = await apiClient.post("/auth/login", payload);
  return result.data;
}

export async function signUpApi(payload: SignUpInput) {
  const result = await apiClient.post("/auth/signup", payload);
  return result.data;
}
