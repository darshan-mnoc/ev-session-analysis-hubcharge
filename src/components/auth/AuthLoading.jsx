/**
 * Auth Loading Component
 * Shown while checking authentication status
 */

import React from "react";

const AuthLoading = () => (
  <div className="auth-loading">
    <div className="auth-loading-spinner"></div>
    <p>Checking authentication...</p>
  </div>
);

export default AuthLoading;
