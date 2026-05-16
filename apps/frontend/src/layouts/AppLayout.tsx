import type { PropsWithChildren } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { useUiStore } from "../store/ui.store";
import { Button } from "../components/ui/Button";
import { adminRoles, accountantRoles, operationalRoles } from "../constants/workflow";
import type { Role } from "../types/domain";
const nav: { to: string; label: string; roles: Role[] }[] = [
  { to: "/dashboard", label: "Command Center", roles: operationalRoles }, { to: "/claims", label: "Claims", roles: operationalRoles }, { to: "/settlements", label: "Settlements", roles: accountantRoles }, { to: "/alerts", label: "Alerts", roles: operationalRoles }, { to: "/reports", label: "Reports", roles: operationalRoles }, { to: "/insurance", label: "Insurance", roles: adminRoles }, { to: "/departments", label: "Departments", roles: adminRoles }, { to: "/users", label: "Users", roles: adminRoles }, { to: "/settings", label: "Settings", roles: operationalRoles },
];
export function AppLayout({ children }: PropsWithChildren) { const { user, logout, hasRole } = useAuthStore(); const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useUiStore(); const navigate = useNavigate(); return <div className="app-shell"><aside className={sidebarCollapsed ? "sidebar collapsed" : "sidebar"}><div className="brand"><strong>MH</strong><span>Claims Control</span></div><nav>{nav.filter((item) => hasRole(item.roles)).map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}</nav></aside><div className="workspace"><header className="topbar"><div><button className="link-button" onClick={toggleSidebar} type="button">☰</button><span className="topbar-title">Malavia Hospital Confidential</span></div><div className="topbar-actions"><span className="user-chip">{user?.fullName ?? "Operator"} · {user?.role}</span><Button variant="secondary" onClick={toggleTheme}>{theme === "dark" ? "Light" : "Dark"}</Button><Button variant="ghost" onClick={() => { logout(); navigate("/login"); }}>Logout</Button></div></header><main className="page-frame">{children}</main></div></div>; }
