import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Logo from "./assets/hubcharge-logo.png";

export default function Layout({ children }) {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return children;
  }

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            {/* <img
              src={Logo}
              alt="icon"
              style={{ width: 150, height: 70, objectFit: "contain" }}
            /> */}
            <span style={{ fontSize: 20 }}>EV Analytics</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link
            to="/"
            className={`nav-item ${location.pathname === "/" ? "active" : ""}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            Sessions
          </Link>
          <Link
            to="/calculator"
            className={`nav-item ${location.pathname === "/calculator" ? "active" : ""}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="10" y2="10" />
              <line x1="14" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="10" y2="14" />
              <line x1="14" y1="14" x2="16" y2="14" />
              <line x1="8" y1="18" x2="16" y2="18" />
            </svg>
            Calculator
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button className="refresh-btn" onClick={logout}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">{children}</main>
    </div>
  );
}
