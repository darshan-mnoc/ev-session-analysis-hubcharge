import { createContext, useContext, useState, useCallback, useEffect } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "ev_dashboard_auth";
const EXPIRY_HOURS = 24;

// Helper to check if stored auth is still valid (within 24 hours)
const getStoredAuth = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const { username, password, timestamp } = JSON.parse(stored);
    const now = Date.now();
    const expiryTime = EXPIRY_HOURS * 60 * 60 * 1000; // 24 hours in ms

    if (now - timestamp < expiryTime) {
      return { username, password };
    }
    // Expired - clear storage
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

// Helper to save auth to localStorage
const saveAuth = (username, password) => {
  const data = {
    username,
    password,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Helper to clear auth from localStorage
const clearAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [authHeader, setAuthHeader] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored credentials on mount
  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      const { username, password } = storedAuth;
      const header = "Basic " + btoa(`${username}:${password}`);
      setCredentials({ username, password });
      setAuthHeader(header);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((username, password) => {
    const header = "Basic " + btoa(`${username}:${password}`);
    setCredentials({ username, password });
    setAuthHeader(header);
    setIsAuthenticated(true);
    // Save to localStorage for persistence
    saveAuth(username, password);
  }, []);

  const logout = useCallback(() => {
    setCredentials({ username: "", password: "" });
    setAuthHeader("");
    setIsAuthenticated(false);
    // Clear from localStorage
    clearAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        credentials,
        authHeader,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
