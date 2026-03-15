/**
 * Application Configuration & Constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: "https://hubcharge.micronocinc.com/management/api",
};

// HubCharge login URL for redirects
export const HUBCHARGE_LOGIN_URL =
  "https://hubcharge.micronocinc.com/login.html?next=https%3A%2F%2Fev-session-dashboard.vercel.app%2F";

// Pagination
export const ITEMS_PER_PAGE = 10;
export const PANEL_PAGE_SIZE = 10;

// Chart thresholds
export const INDIVIDUAL_THRESHOLD = 3; // Only show individual lines for <= 3 sessions

// Time range options for chart filtering
export const TIME_RANGE_OPTIONS = [
  { value: 10, label: "First 10 min" },
  { value: 15, label: "First 15 min" },
  { value: 20, label: "First 20 min" },
  { value: 25, label: "First 25 min" },
  { value: 30, label: "First 30 min" },
  { value: 35, label: "First 35 min" },
  { value: 40, label: "First 40 min" },
  { value: 45, label: "First 45 min" },
  { value: 50, label: "First 50 min" },
  { value: 55, label: "First 55 min" },
  { value: 60, label: "First 60 min" },
  { value: "full", label: "Full Session" },
];

// Chart colors
export const CHART_COLORS = {
  primary: "#22c55e",
  accent: "var(--accent)",
  voltage400: "#22c55e",
  voltage800: "var(--accent)",
  power: "#f97316",
  secondary: "#52525b",
};

// Default filter state
export const DEFAULT_FILTERS = {
  site: "all",
  machineType: "all",
  connectorType: "all",
  cpid: "all",
  status: "all",
  voltageArch: "all",
  search: "",
};
