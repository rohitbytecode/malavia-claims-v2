import { create } from "zustand";
export type Theme = "light" | "dark";
interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}
const initialTheme =
  (localStorage.getItem("mh_theme") as Theme | null) ??
  (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme,
  sidebarCollapsed: false,
  setTheme: (theme) => {
    localStorage.setItem("mh_theme", theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
export const applyInitialTheme = () => {
  document.documentElement.dataset.theme = initialTheme;
};
