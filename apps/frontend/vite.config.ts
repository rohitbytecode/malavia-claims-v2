process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendSslKey = new URL("../backend/cert/key.pem", import.meta.url);
const backendSslCert = new URL("../backend/cert/cert.pem", import.meta.url);

function resolveHttpsOptions() {
  if (!existsSync(backendSslKey) || !existsSync(backendSslCert)) {
    return undefined;
  }
  return {
    key: readFileSync(backendSslKey),
    cert: readFileSync(backendSslCert),
  };
}

export default defineConfig(({ mode }) => ({
  base: "/",

  plugins: [react()],

  define:
    mode === "production"
      ? {
          "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api/v1"),
        }
      : {},

  server: {
    host: "0.0.0.0",
    https: resolveHttpsOptions(),
    proxy: {
      "/api": {
        target: "https://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on("error", (err) => console.log("API Proxy Error:", err));
        },
      },
      "/socket.io": {
        target: "https://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on("error", (err) => console.log("Socket Proxy Error:", err));
        },
      },
    },
  },
}));
