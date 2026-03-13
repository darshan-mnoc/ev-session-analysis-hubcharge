import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

// ─── context hook ────────────────────────────────────────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ─── provider ────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // ── bootstrap: check for existing session ─────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        console.log("[Auth] Checking session on load...", data);

        if (error) {
          console.error("[Auth] Session check failed:", error.message);
          setAuthError(error.message);
          setIsLoading(false);
          return;
        }

        if (data?.session) {
          console.log("[Auth] Logged in:", data.session.user?.email);
          setSession(data.session);
        } else {
          console.log("[Auth] No active session, login required");
        }

        setIsLoading(false);
      } catch (e) {
        console.error("[Auth] Unexpected error:", e);
        setAuthError(e.message);
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log("[Auth] State changed:", _event);
      setSession(newSession);
      setAuthError(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── login with email/password ─────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setAuthError(null);

    const trimmedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const trimmedPassword = String(password || "");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (error) {
      console.error("[Auth] Login failed:", error.message);
      setAuthError(error.message);
      return null;
    }

    console.log("[Auth] Login success:", data.user?.email);
    setSession(data.session);
    return data.session;
  }, []);

  // ── login with Google OAuth ───────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("[Auth] Google login failed:", error.message);
      setAuthError(error.message);
    }
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[Auth] Logout failed:", error.message);
    }
    setSession(null);
  }, []);

  // ── handle 401 from API ───────────────────────────────────────────────────
  const handleUnauthorized = useCallback(async () => {
    console.warn("[Auth] 401 received, refreshing session...");

    // Try to refresh the session
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      console.error("[Auth] Session refresh failed, logging out");
      setSession(null);
      setAuthError("Your session has expired. Please log in again.");
    } else {
      console.log("[Auth] Session refreshed");
      setSession(data.session);
    }
  }, []);

  // ── get Authorization header for API calls ────────────────────────────────
  const getAuthHeader = useCallback(() => {
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }, [session]);

  // ── derived state ─────────────────────────────────────────────────────────
  const isAuthenticated = !!session?.access_token;
  const user = session?.user || null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAuthenticated,
        isLoading,
        authError,
        login,
        loginWithGoogle,
        logout,
        handleUnauthorized,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
