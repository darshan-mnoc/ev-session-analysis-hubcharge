import React from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Logo from "./assets/hubcharge-logo.png";

export default function Layout({ children }) {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return children;
  }

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="dashboard">
      {/* Mobile menu overlay */}
      <div
        className={`sidebar-overlay ${mobileMenuOpen ? "visible" : ""}`}
        onClick={closeMobileMenu}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span>EV Analytics</span>
          </div>
          {/* Close button for mobile */}
          <button
            className="mobile-close-btn"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* User info on mobile */}
          {user && (
            <div className="nav-item user-info-item">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="user-email-sidebar">{user.email}</span>
            </div>
          )}
          <Link
            to="/"
            className={`nav-item ${location.pathname === "/" ? "active" : ""}`}
            onClick={closeMobileMenu}
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
            onClick={closeMobileMenu}
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
          <Link
            to="/financial"
            className={`nav-item ${location.pathname === "/financial" ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
              <circle cx="12" cy="8" r="2" />
              <circle cx="18" cy="3" r="2" />
              <circle cx="6" cy="12" r="2" />
            </svg>
            Financial
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button
            className="refresh-btn"
            onClick={() => {
              logout();
              closeMobileMenu();
            }}
          >
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

      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Main Content */}
      <main className="main-content">{children}</main>
    </div>
  );
}
