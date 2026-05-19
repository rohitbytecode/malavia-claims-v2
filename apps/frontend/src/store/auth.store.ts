import { create } from "zustand";
import type { AuthTokens, User, Role } from "../types/domain";
interface AuthState {
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  setSession: (user: User, tokens: AuthTokens) => void;
  updateTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
}
const read = <T>(key: string): T | undefined => {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : undefined;
};
export const useAuthStore = create<AuthState>((set, get) => ({
  user: read<User>("mh_user"),
  accessToken: localStorage.getItem("mh_access") ?? undefined,
  refreshToken: localStorage.getItem("mh_refresh") ?? undefined,
  setSession: (user, tokens) => {
    localStorage.setItem("mh_user", JSON.stringify(user));
    localStorage.setItem("mh_access", tokens.accessToken);
    localStorage.setItem("mh_refresh", tokens.refreshToken);
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },
  updateTokens: (tokens) => {
    localStorage.setItem("mh_access", tokens.accessToken);
    localStorage.setItem("mh_refresh", tokens.refreshToken);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },
  logout: () => {
    localStorage.removeItem("mh_user");
    localStorage.removeItem("mh_access");
    localStorage.removeItem("mh_refresh");
    set({ user: undefined, accessToken: undefined, refreshToken: undefined });
  },
  hasRole: (roles) => {
    const role = get().user?.role;
    return role ? roles.includes(role) : false;
  },
}));
