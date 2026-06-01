import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyInitialTheme } from "./store/ui.store";
import { loadRuntimeConfig } from "./lib/config";
import "./index.css";

applyInitialTheme();

loadRuntimeConfig().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
