/**
 * Access Denied Component
 * Shown when user is authenticated but doesn't have API access
 */

import React from "react";
import { useAuth } from "../../AuthContext";
import Logo from "../../assets/hubcharge-logo.png";

const AccessDenied = () => {
  const { user, apiAccessError, logout } = useAuth();

  return (
    <div className="auth-loading">
      <div className="login-form-container">
        <img src={Logo} alt="HubCharge" className="login-logo" />
        <h2>Access Denied</h2>
        <div className="login-error" style={{ marginTop: "16px" }}>
          {apiAccessError}
        </div>
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: "16px",
            fontSize: "14px",
          }}
        >
          Signed in as: {user?.email}
        </p>
        <button
          type="button"
          className="login-btn"
          onClick={logout}
          style={{ marginTop: "20px" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;
