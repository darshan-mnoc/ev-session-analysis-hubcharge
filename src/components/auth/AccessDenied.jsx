import React from "react";
import { useAuth } from "../../AuthContext";
import Logo from "../../assets/hubcharge-logo.png";

const AccessDenied = () => {
  const { user, apiAccessError, logout } = useAuth();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f4f5f6",
      padding: "24px",
      fontFamily: "var(--font-body, Montserrat, sans-serif)",
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e4e6e9",
        boxShadow: "0 4px 24px rgba(16,24,40,0.08)",
        padding: "40px 36px 36px",
        width: "100%",
        maxWidth: "400px",
        textAlign: "center",
      }}>
        {/* Logo */}
        <img
          src={Logo}
          alt="HubCharge"
          style={{ height: 36, width: "auto", marginBottom: 28, objectFit: "contain" }}
        />

        {/* Icon */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(220,38,38,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#18181b",
          margin: "0 0 8px",
          letterSpacing: "-0.3px",
        }}>
          Access Denied
        </h2>

        {/* Error message */}
        {apiAccessError && (
          <p style={{
            fontSize: 13,
            color: "#dc2626",
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            margin: "16px 0",
            lineHeight: 1.5,
          }}>
            {apiAccessError}
          </p>
        )}

        {/* Email */}
        {user?.email && (
          <p style={{
            fontSize: 12,
            color: "#94a1ad",
            margin: "12px 0 24px",
          }}>
            Signed in as <strong style={{ color: "#52606d" }}>{user.email}</strong>
          </p>
        )}

        {/* Sign out button */}
        <button
          onClick={logout}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "10px 24px",
            borderRadius: 8,
            border: "1px solid #e4e6e9",
            background: "#ffffff",
            color: "#18181b",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f4f5f6"}
          onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;
