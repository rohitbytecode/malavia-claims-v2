import { create } from "zustand";
import type { AuthTokens, User, Role } from "../types/domain";
interface AuthState {
  user?: User;
  organizationId?: string;
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
  user: read<User>("mh_user:v1"),
  organizationId: localStorage.getItem("mh_org:v1") ?? undefined,
  accessToken: localStorage.getItem("mh_access:v1") ?? undefined,
  refreshToken: localStorage.getItem("mh_refresh:v1") ?? undefined,
  setSession: (user, tokens) => {
    localStorage.setItem("mh_user:v1", JSON.stringify(user));
    localStorage.setItem("mh_access:v1", tokens.accessToken);
    localStorage.setItem("mh_refresh:v1", tokens.refreshToken);
    if (user.organizationId) {
      localStorage.setItem("mh_org:v1", user.organizationId);
    }
    set({
      user,
      organizationId: user.organizationId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },
  updateTokens: (tokens) => {
    localStorage.setItem("mh_access:v1", tokens.accessToken);
    localStorage.setItem("mh_refresh:v1", tokens.refreshToken);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },
  logout: () => {
    localStorage.removeItem("mh_user:v1");
    localStorage.removeItem("mh_access:v1");
    localStorage.removeItem("mh_refresh:v1");
    localStorage.removeItem("mh_org:v1");
    set({ user: undefined, organizationId: undefined, accessToken: undefined, refreshToken: undefined });
  },
  hasRole: (roles) => {
    const role = get().user?.role;
    return role ? roles.includes(role) : false;
  },
}));

