import React, { useState } from "react";
import { useAuth } from "../../AuthContext";
import Logo from "../../assets/hubcharge-logo.png";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const Spinner = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const LoginForm = () => {
  const { loginWithEmail, verifyOtp, loginWithGoogle, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await loginWithEmail(email);
    setLoading(false);
    if (ok) setSent(true);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    await verifyOtp(email, code);
    setVerifying(false);
  };

  const handleReset = () => {
    setSent(false);
    setEmail("");
    setCode("");
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img
            src={Logo}
            alt="HubCharge"
            style={{ height: 36, width: "auto", maxWidth: 180, objectFit: "contain", display: "inline-block" }}
          />
        </div>

        {/* Title */}
        <div className="login-header" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            HubCharge Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            {sent ? `Sign-in code sent to ${email}` : "Sign in to access your EV analytics"}
          </p>
        </div>

        {/* Error */}
        {authError && (
          <div className="login-error" style={{ marginBottom: 14 }}>{authError}</div>
        )}

        {sent ? (
          <>
            <div className="input-group">
              <label htmlFor="code">Verification code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                autoFocus
                style={{ textAlign: "center", letterSpacing: "0.4em", fontSize: 18 }}
              />
            </div>
            <button className="login-btn" onClick={handleVerify} disabled={verifying || !code} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {verifying ? <Spinner /> : null}
              {verifying ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              onClick={handleReset}
              style={{ marginTop: 10, background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            >
              Use a different email
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <button className="login-btn" type="submit" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <Spinner /> : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                )}
                {loading ? "Sending…" : "Send sign-in code"}
              </button>
            </form>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="login-btn google-btn"
              onClick={loginWithGoogle}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginForm;
