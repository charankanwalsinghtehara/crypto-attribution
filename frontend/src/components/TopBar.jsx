import { Bell, CircleHelp, Menu, Search, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Topbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("current_user") || "null");
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("current_user");
    navigate("/login", { replace: true });
  };
  return (
    <header className="topbar">
      <button className="mobile-menu-button" type="button" aria-label="Open menu"><Menu size={20} /></button>
      <div className="topbar-search"><Search size={17} /><input type="search" placeholder="Search documents, hashes or records..." /></div>
      <div className="topbar-actions">
        <button className="icon-button" type="button" aria-label="Help"><CircleHelp size={19} /></button>
        <button className="icon-button notification-button" type="button" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button>
        <div className="topbar-divider" />
        <div className="topbar-identity">
          <div className="topbar-avatar">{user?.username?.charAt(0)?.toUpperCase() || "U"}</div>
          <div><strong>{user?.username || "User"}</strong><span>Authenticated user</span></div>
        </div>
        <button className="icon-button" type="button" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={18} /></button>
      </div>
    </header>
  );
}
export default Topbar;
