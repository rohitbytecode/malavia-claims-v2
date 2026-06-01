import { getRuntimeConfig } from "./config";
import axios from "axios";

export const apiClient = axios.create({
  baseURL: (() => {
    try {
      return getRuntimeConfig().apiBaseUrl;
    } catch {
      return import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
    }
  })(),
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});
