import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyInitialTheme } from "./store/ui.store";
import "./index.css";
applyInitialTheme();
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
