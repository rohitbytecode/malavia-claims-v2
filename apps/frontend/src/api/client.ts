import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth.store";
import type { ApiResponse, AuthTokens } from "../types/domain";
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
let refreshRequest: Promise<AuthTokens> | null = null;
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;
    if (error.response?.status !== 401 || original?._retry)
      return Promise.reject(error);
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken || !original) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }
    original._retry = true;
    refreshRequest ??= axios
      .post<ApiResponse<AuthTokens>>(
        `${apiClient.defaults.baseURL}/auth/refresh`,
        { refreshToken }
      )
      .then((res) => res.data.data)
      .finally(() => {
        refreshRequest = null;
      });
    const tokens = await refreshRequest;
    useAuthStore.getState().updateTokens(tokens);
    original.headers = {
      ...original.headers,
      Authorization: `Bearer ${tokens.accessToken}`,
    };
    return apiClient(original);
  }
);
export const unwrap = async <T>(
  request: Promise<{ data: ApiResponse<T> }>
): Promise<T> => (await request).data.data;
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Unexpected error";
}
