process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
  ],

  server: {
    host: "0.0.0.0",

    https: {},

    proxy: {
      "/api": {
        target: "https://127.0.0.1:5000",

        changeOrigin: true,

        secure: false,

        ws: true,

        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.log(
              "API Proxy Error:",
              err
            );
          });
        },
      },

      "/socket.io": {
        target: "https://127.0.0.1:5000",

        changeOrigin: true,

        secure: false,

        ws: true,

        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.log(
              "Socket Proxy Error:",
              err
            );
          });
        },
      },
    },
  },
});