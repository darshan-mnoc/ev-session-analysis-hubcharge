/**
 * Universal API Client
 * A centralized API wrapper for handling all HTTP requests with:
 * - Automatic authentication header injection
 * - Consistent error handling
 * - 401 unauthorized handling
 * - Response parsing
 * - Loading state management
 */

import { API_CONFIG } from "../constants/config";

class ApiClient {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.getAuthHeader = null;
    this.onUnauthorized = null;
  }

  /**
   * Initialize the API client with auth functions
   * Call this once when your app mounts or auth context is available
   */
  init({ getAuthHeader, onUnauthorized }) {
    this.getAuthHeader = getAuthHeader;
    this.onUnauthorized = onUnauthorized;
  }

  /**
   * Build full URL from endpoint
   */
  buildUrl(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  }

  /**
   * Core request method
   */
  async request(endpoint, options = {}) {
    const {
      method = "GET",
      params = {},
      body = null,
      headers = {},
      skipAuth = false,
      noCache = true, // Default to no cache for fresh data
    } = options;

    // Add cache-busting timestamp for GET requests
    const requestParams = { ...params };
    if (method === "GET" && noCache) {
      requestParams._t = Date.now();
    }

    const url = this.buildUrl(endpoint, requestParams);

    const requestHeaders = {
      "Content-Type": "application/json",
      // Prevent caching
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      ...headers,
    };

    // Add auth header if available and not skipped
    if (!skipAuth && this.getAuthHeader) {
      const authHeader = this.getAuthHeader();
      Object.assign(requestHeaders, authHeader);
    }

    const fetchOptions = {
      method,
      headers: requestHeaders,
      credentials: "include",
      cache: "no-store", // Prevent browser cache
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      // Handle 401 - unauthorized
      if (response.status === 401) {
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
        throw new ApiError("Session expired. Please log in again.", 401);
      }

      // Handle other error status codes
      if (!response.ok) {
        const errorMessage = await this.parseErrorMessage(response);
        throw new ApiError(errorMessage, response.status);
      }

      // Parse JSON response
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // Network or other errors
      throw new ApiError(
        error.message || "Network error. Please check your connection.",
        0,
      );
    }
  }

  /**
   * Parse error message from response
   */
  async parseErrorMessage(response) {
    try {
      const data = await response.json();
      return (
        data.message ||
        data.error ||
        `Request failed with status ${response.status}`
      );
    } catch {
      return `Request failed with status ${response.status}`;
    }
  }

  // ============ Convenience Methods ============

  /**
   * GET request
   */
  async get(endpoint, params = {}, options = {}) {
    return this.request(endpoint, { ...options, method: "GET", params });
  }

  /**
   * POST request
   */
  async post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body });
  }

  /**
   * PUT request
   */
  async put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, method: "PATCH", body });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// ============ API Endpoints ============
// Centralized endpoint definitions for easy maintenance

export const endpoints = {
  // Views
  miniView: "/views/mini_view",

  // Transactions
  emsTransactions: "/ems_transactions",

  // Add more endpoints as needed
  // sessions: "/sessions",
  // users: "/users",
};

// ============ API Service Functions ============
// Pre-built functions for common API calls

// Page size matches the working portal call (?limit=500&page=N).
const PAGE_SIZE = 500;
const TIMEZONE = "America/Los_Angeles";

export const sessionApi = {
  /**
   * Fetch the full mini_view dataset (session summaries) using page-based
   * pagination. `onPage(rows, total)` streams each page as it arrives.
   */
  async getMiniView(range = "year", { onProgress = null, onPage = null } = {}) {
    return fetchAllPages(
      endpoints.miniView,
      { range, timezone: TIMEZONE },
      { onProgress, onPage },
    );
  },

  /**
   * Fetch the full EMS transactions dataset using page-based pagination.
   */
  async getEmsTransactions({ onProgress = null, onPage = null } = {}) {
    return fetchAllPages(endpoints.emsTransactions, {}, { onProgress, onPage });
  },
};

/**
 * Parse response data from different formats
 */
function parseResponseData(response) {
  if (Array.isArray(response)) {
    return response;
  } else if (response.rows && Array.isArray(response.rows)) {
    return response.rows;
  } else if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  return [];
}

/**
 * Fetch one page. Returns { ok, rows }.
 */
async function fetchPage(endpoint, baseParams, page) {
  try {
    const response = await apiClient.get(endpoint, {
      ...baseParams,
      limit: PAGE_SIZE,
      page,
    });
    return { ok: true, rows: parseResponseData(response) };
  } catch {
    return { ok: false, rows: [] };
  }
}

/**
 * Fetch every page with `?limit=500&page=N` (the scheme the portal uses).
 *
 * - Streams each page to `onPage(rows, total)` so callers render immediately.
 * - Stops when a page returns fewer than PAGE_SIZE rows (the last page).
 * - `onProgress` gets { count, fraction } to drive a progress bar.
 */
async function fetchAllPages(
  endpoint,
  baseParams = {},
  { onProgress = null, onPage = null } = {},
) {
  const all = [];
  let page = 1;

  // Hard cap so a misbehaving endpoint can never loop forever.
  while (page <= 100) {
    const { ok, rows } = await fetchPage(endpoint, baseParams, page);
    if (!ok || rows.length === 0) break;

    all.push(...rows);
    if (onPage) onPage(rows, all.length);
    if (onProgress) {
      // Last page → 1; otherwise edge toward completion as pages accrue.
      const fraction = rows.length < PAGE_SIZE ? 1 : Math.min(0.9, page / 6);
      onProgress({ count: all.length, fraction });
    }

    if (rows.length < PAGE_SIZE) break; // last page
    page += 1;
  }

  if (onProgress) onProgress({ count: all.length, fraction: 1 });
  console.log(`✓ Fetched ${all.length} records (${page} page[s])`);
  return all;
}

export default apiClient;
