import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyInitialTheme } from "./store/ui.store";
import { loadRuntimeConfig } from "./lib/config";
import "./index.css";

applyInitialTheme();

loadRuntimeConfig().then(async () => {
  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
