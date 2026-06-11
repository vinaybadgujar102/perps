import type {
  ApiEnvelope,
  LoginData,
  LoginInput,
  SignUpData,
  SignUpInput,
} from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";

export async function loginApi(
  payload: LoginInput,
): Promise<ApiEnvelope<LoginData>> {
  const result = await apiClient.post<ApiEnvelope<LoginData>>(
    "/auth/login",
    payload,
  );
  return result.data;
}

export async function signUpApi(
  payload: SignUpInput,
): Promise<ApiEnvelope<SignUpData>> {
  const result = await apiClient.post<ApiEnvelope<SignUpData>>(
    "/auth/signup",
    payload,
  );
  return result.data;
}
