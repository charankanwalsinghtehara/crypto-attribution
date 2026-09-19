import {
  Activity,
  Archive,
  Database,
  FileCheck2,
  FileUp,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserRound
} from "lucide-react";

import { NavLink } from "react-router-dom";

const navigationItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard
  },
  {
    label: "Documents",
    path: "/documents",
    icon: Archive
  },
  {
    label: "Upload Document",
    path: "/documents/upload",
    icon: FileUp
  },
  {
    label: "Attribution",
    path: "/attribution",
    icon: FileCheck2
  },
  {
    label: "Ledger",
    path: "/ledger",
    icon: Database
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings
  }
];

function Sidebar() {
  const user = JSON.parse(localStorage.getItem("current_user") || "null");
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <ShieldCheck size={24} />
        </div>

        <div>
          <h1>Crypto</h1>
          <p>Attribution</p>
        </div>
      </div>

      <div className="sidebar-section-label">
        WORKSPACE
      </div>

      <nav className="sidebar-navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive ? "sidebar-link-active" : ""
                }`
              }
            >
              <Icon size={18} />

              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="system-status">
          <span className="status-dot" />

          <div>
            <strong>System Online</strong>
            <small>API connection ready</small>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            <UserRound size={16} />
          </div>

          <div>
            <strong>{user?.username || "User"}</strong>
            <small>Authenticated account</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;