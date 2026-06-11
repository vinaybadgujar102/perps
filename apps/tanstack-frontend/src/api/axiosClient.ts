import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Our API returns errors in the response body as { message: "..." }, but axios
// treats any non-2xx status as a failure and rejects the promise. When that
// happens, error.message is axios's own text (e.g. "Request failed with status
// code 401"), not the message our backend sent. This interceptor reads
// response.data.message and re-throws it as a normal Error so callers (mutations,
// etc.) can always use error.message without knowing about AxiosError.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.length > 0) {
      return Promise.reject(new Error(message));
    }

    return Promise.reject(
      new Error(error.message || "Unable to reach the server."),
    );
  },
);
