import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth.store";
import type { ApiResponse, AuthTokens } from "../types/domain";
import { getRuntimeConfig } from "../lib/config";

export const apiClient = axios.create({
  baseURL: (() => {
    try {
      return getRuntimeConfig().apiBaseUrl;
    } catch {
      return import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
    }
  })(),
  headers: { "Content-Type": "application/json" },
  timeout: 5_000,
});

apiClient.interceptors.request.use((config) => {
  try {
    config.baseURL = getRuntimeConfig().apiBaseUrl;
  } catch {
    // Ignore and use default
  }
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function normalizeIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeIds);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (!obj._id && obj.id) {
      obj._id = obj.id;
    }
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "object") {
        obj[key] = normalizeIds(obj[key]);
      }
    }
  }
  return value;
}

let refreshRequest: Promise<AuthTokens> | null = null;

apiClient.interceptors.response.use(
  (response) => {
    if (response.data?.data) {
      response.data.data = normalizeIds(response.data.data);
    }
    return response;
  },
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
    const baseURL = (() => {
      try {
        return getRuntimeConfig().apiBaseUrl;
      } catch {
        return apiClient.defaults.baseURL ?? "/api/v1";
      }
    })();
    refreshRequest ??= axios
      .post<ApiResponse<AuthTokens>>(`${baseURL}/auth/refresh`, {
        refreshToken,
      })
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
