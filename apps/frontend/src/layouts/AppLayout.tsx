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

type NavIconName =
  | "dashboard"
  | "claims"
  | "alerts"
  | "settlements"
  | "reports"
  | "insurance"
  | "departments"
  | "users"
  | "settings";

function NavIcon({ name }: { name: NavIconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M4 13.5a8 8 0 1 1 16 0" />
          <path d="M12 13l4-5" />
          <path d="M5 19h14" />
        </svg>
      );
    case "claims":
      return (
        <svg {...common}>
          <path d="M7 3.5h7l3 3V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M14 3.5V7h3.5" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "alerts":
      return (
        <svg {...common}>
          <path d="M12 3 2.7 19h18.6L12 3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "settlements":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M6 7V5h12v2" />
          <rect x="4" y="7" width="16" height="12" rx="2" />
          <path d="M8 13h8" />
          <path d="M8 16h5" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M5 20V4" />
          <path d="M5 20h15" />
          <path d="M9 16v-5" />
          <path d="M13 16V8" />
          <path d="M17 16v-3" />
        </svg>
      );
    case "insurance":
      return (
        <svg {...common}>
          <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      );
    case "departments":
      return (
        <svg {...common}>
          <path d="M4 21V8l8-5 8 5v13" />
          <path d="M9 21v-6h6v6" />
          <path d="M8 10h.01" />
          <path d="M12 10h.01" />
          <path d="M16 10h.01" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1.1V21a2 2 0 0 1-4 0v-.06a1.8 1.8 0 0 0-1.4-1.76 1.8 1.8 0 0 0-1.6.45l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.1-.4H3a2 2 0 0 1 0-4h.06A1.8 1.8 0 0 0 4.8 8.2a1.8 1.8 0 0 0-.45-1.6l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .4-1.1V3a2 2 0 0 1 4 0v.06A1.8 1.8 0 0 0 15.8 4.8a1.8 1.8 0 0 0 1.6-.45l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.8 1.8 0 0 0 19.4 9c.28.34.62.55 1 .6.36.05.72.04 1.1.04H21a2 2 0 0 1 0 4h-.06a1.8 1.8 0 0 0-1.54 1.36Z" />
        </svg>
      );
  }
}

const NAV_ITEMS: {
  to: string;
  label: string;
  icon: NavIconName;
  roles: Role[];
  group: string;
}[] = [
  {
    to: "/dashboard",
    label: "Command Center",
    icon: "dashboard",
    roles: operationalRoles,
    group: "operations",
  },
  {
    to: "/claims",
    label: "Claims",
    icon: "claims",
    roles: operationalRoles,
    group: "operations",
  },
  {
    to: "/alerts",
    label: "Alerts",
    icon: "alerts",
    roles: operationalRoles,
    group: "operations",
  },
  {
    to: "/settlements",
    label: "Settlements",
    icon: "settlements",
    roles: accountantRoles,
    group: "finance",
  },
  {
    to: "/reports",
    label: "Reports",
    icon: "reports",
    roles: operationalRoles,
    group: "finance",
  },
  {
    to: "/insurance",
    label: "Insurance",
    icon: "insurance",
    roles: adminRoles,
    group: "administration",
  },
  {
    to: "/departments",
    label: "Departments",
    icon: "departments",
    roles: adminRoles,
    group: "administration",
  },
  {
    to: "/users",
    label: "Users",
    icon: "users",
    roles: adminRoles,
    group: "administration",
  },
  {
    to: "/settings",
    label: "Settings",
    icon: "settings",
    roles: operationalRoles,
    group: "system",
  },
];

const ROLE_META: Record<Role, { label: string; color: string; abbr: string }> =
  {
    SUPER_ADMIN: { label: "Super Admin", color: "var(--amber)", abbr: "SA" },
    ADMIN: {
      label: "Administrator",
      color: "var(--accent-primary)",
      abbr: "AD",
    },
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
                      <span className="sidebar__link-icon">
                        <NavIcon name={item.icon} />
                      </span>
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
