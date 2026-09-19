import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    ["/dashboard", "Dashboard"],
    ["/documents", "Documents"],
    ["/documents/upload", "Upload"],
    ["/attribution", "Attribution"],
    ["/ledger", "Ledger"],
    ["/settings", "Settings"],
  ];

  return (
    <div style={{minHeight: "100vh"}}>
      <header style={{padding: "1rem 2rem", borderBottom: "1px solid #ddd", display: "flex", gap: "1rem", alignItems: "center"}}>
        <strong>Crypto Attribution</strong>
        <nav style={{display: "flex", gap: "1rem", flex: 1}}>
          {links.map(([href, label]) => (
            <Link key={href} to={href} aria-current={location.pathname === href ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <span>{user?.username}</span>
        <button onClick={logout}>Logout</button>
      </header>
      <Outlet />
    </div>
  );
}
