import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import type { Role } from "../types/domain";
export function ProtectedRoute({ children, roles }: PropsWithChildren<{ roles?: Role[] }>) { const { user, accessToken } = useAuthStore(); if (!user || !accessToken) return <Navigate to="/login" replace />; if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />; return children; }
