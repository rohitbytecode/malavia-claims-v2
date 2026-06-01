import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "../store/auth.store";
import { getRuntimeConfig } from "./config";

let socket: Socket | null = null;

function resolveSocketUrl(): string {
  try {
    return getRuntimeConfig().socketUrl;
  } catch {
    const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL;
    if (explicitSocketUrl) return explicitSocketUrl;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl?.startsWith("http")) return new URL(apiBaseUrl).origin;

    const explicitSocketPort = import.meta.env.VITE_SOCKET_PORT;
    if (explicitSocketPort) {
      return `${window.location.protocol}//${window.location.hostname}:${explicitSocketPort}`;
    }

    return window.location.origin;
  }
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(resolveSocketUrl(), {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: (callback) => {
      callback({ token: useAuthStore.getState().accessToken });
    },
  });

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
