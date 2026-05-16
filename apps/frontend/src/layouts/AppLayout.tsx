import type { PropsWithChildren } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/auth.store";
import { useUiStore } from "../store/ui.store";
import {
  adminRoles,
  accountantRoles,
  operationalRoles,
} from "../constants/workflow";
import type { Role } from "../types/domain";

const NAV_ITEMS: {
  to: string;
  label: string;
  icon: string;
  roles: Role[];
  group: string;
}[] = [
  {
    to: "/dashboard",
    label: "Command Center",
    icon: "◈",
    roles: operationalRoles,
    group: "operations",
  },
  {
    to: "/claims",
    label: "Claims",
    icon: "◉",
    roles: operationalRoles,
    group: "operations",
  },
  {
    to: "/alerts",
    label: "Alerts",
    icon: "◬",
    roles: operationalRoles,
    group: "operations",
  },
  {
    to: "/settlements",
    label: "Settlements",
    icon: "◎",
    roles: accountantRoles,
    group: "finance",
  },
  {
    to: "/reports",
    label: "Reports",
    icon: "◫",
    roles: operationalRoles,
    group: "finance",
  },
  {
    to: "/insurance",
    label: "Insurance",
    icon: "◰",
    roles: adminRoles,
    group: "administration",
  },
  {
    to: "/departments",
    label: "Departments",
    icon: "◱",
    roles: adminRoles,
    group: "administration",
  },
  {
    to: "/users",
    label: "Users",
    icon: "◲",
    roles: adminRoles,
    group: "administration",
  },
  {
    to: "/settings",
    label: "Settings",
    icon: "◳",
    roles: operationalRoles,
    group: "system",
  },
];

const ROLE_META: Record<Role, { label: string; color: string; abbr: string }> =
  {
    SUPER_ADMIN: { label: "Super Admin", color: "var(--amber)", abbr: "SA" },
    ADMIN: { label: "Administrator", color: "var(--accent)", abbr: "AD" },
    CLAIM_MANAGER: {
      label: "Claim Manager",
      color: "var(--green)",
      abbr: "CM",
    },
    CLAIM_EXECUTIVE: {
      label: "Claim Executive",
      color: "var(--steel)",
      abbr: "CE",
    },
    ACCOUNTANT: { label: "Accountant", color: "var(--amber)", abbr: "AC" },
  };

export function AppLayout({ children }: PropsWithChildren) {
  const { user, logout, hasRole } = useAuthStore();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [alertCount] = useState(3); // would normally come from query

  const filteredNav = NAV_ITEMS.filter((item) => hasRole(item.roles));
  const groups = ["operations", "finance", "administration", "system"];
  const roleMeta = user?.role ? ROLE_META[user.role] : null;

  const groupLabel: Record<string, string> = {
    operations: "Operations",
    finance: "Finance",
    administration: "Administration",
    system: "System",
  };

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-sidebar",
      sidebarCollapsed ? "collapsed" : "expanded"
    );
  }, [sidebarCollapsed]);

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside
        className={`sidebar${sidebarCollapsed ? " sidebar--collapsed" : ""}`}
      >
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <span>MH</span>
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar__brand-text">
              <strong>Malavia</strong>
              <span>Claims Control</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar__nav">
          {groups.map((group) => {
            const items = filteredNav.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="sidebar__group">
                {!sidebarCollapsed && (
                  <div className="sidebar__group-label">
                    {groupLabel[group]}
                  </div>
                )}
                {items.map((item) => {
                  const isActive =
                    location.pathname === item.to ||
                    (item.to !== "/dashboard" &&
                      location.pathname.startsWith(item.to));
                  const showBadge = item.to === "/alerts" && alertCount > 0;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`sidebar__link${isActive ? " sidebar__link--active" : ""}`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <span className="sidebar__link-icon">{item.icon}</span>
                      {!sidebarCollapsed && (
                        <span className="sidebar__link-label">
                          {item.label}
                        </span>
                      )}
                      {showBadge && (
                        <span
                          className={`sidebar__badge${sidebarCollapsed ? " sidebar__badge--dot" : ""}`}
                        >
                          {sidebarCollapsed ? "" : alertCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          {!sidebarCollapsed && user && (
            <div className="sidebar__user">
              <div
                className="sidebar__user-avatar"
                style={{ borderColor: roleMeta?.color }}
              >
                {roleMeta?.abbr}
              </div>
              <div className="sidebar__user-info">
                <strong>{user.fullName}</strong>
                <span style={{ color: roleMeta?.color }}>
                  {roleMeta?.label}
                </span>
              </div>
            </div>
          )}
          <div className="sidebar__footer-actions">
            <button
              className="sidebar__icon-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              type="button"
            >
              {theme === "dark" ? "◑" : "◐"}
            </button>
            <button
              className="sidebar__icon-btn sidebar__icon-btn--danger"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title="Logout"
              type="button"
            >
              ⊗
            </button>
          </div>
        </div>
      </aside>

      {/* ── WORKSPACE ── */}
      <div className="workspace">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar__left">
            <button
              className="topbar__toggle"
              onClick={toggleSidebar}
              type="button"
              aria-label="Toggle sidebar"
            >
              <span className="topbar__toggle-icon">
                {sidebarCollapsed ? "▶" : "◀"}
              </span>
            </button>

            {/* Breadcrumb */}
            <div className="topbar__breadcrumb">
              <span className="topbar__breadcrumb-root">HICMS</span>
              <span className="topbar__breadcrumb-sep">/</span>
              <span className="topbar__breadcrumb-current">
                {NAV_ITEMS.find(
                  (i) =>
                    location.pathname === i.to ||
                    (i.to !== "/dashboard" &&
                      location.pathname.startsWith(i.to))
                )?.label ?? "Dashboard"}
              </span>
            </div>
          </div>

          <div className="topbar__right">
            <div className="topbar__system-badge">
              <span className="topbar__live-dot" />
              <span>Live</span>
            </div>
            {user && (
              <div
                className="topbar__role-chip"
                style={{ borderColor: roleMeta?.color }}
              >
                <span style={{ color: roleMeta?.color }}>{roleMeta?.abbr}</span>
                <span>{user.fullName.split(" ")[0]}</span>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="page-frame">{children}</main>
      </div>
    </div>
  );
}
