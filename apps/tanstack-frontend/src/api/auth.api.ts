import type {
  ApiEnvelope,
  LoginDataResult,
  LoginInput,
  SignUpDataResult,
  SignUpInput,
} from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";

export async function loginApi(
  payload: LoginInput,
): Promise<ApiEnvelope<LoginDataResult>> {
  const result = await apiClient.post<ApiEnvelope<LoginDataResult>>(
    "/auth/login",
    payload,
  );
  return result.data;
}

export async function signUpApi(
  payload: SignUpInput,
): Promise<ApiEnvelope<SignUpDataResult>> {
  const result = await apiClient.post<ApiEnvelope<SignUpDataResult>>(
    "/auth/signup",
    payload,
  );
  return result.data;
}
