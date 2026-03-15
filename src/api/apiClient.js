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
    } = options;

    const url = this.buildUrl(endpoint, params);

    const requestHeaders = {
      "Content-Type": "application/json",
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
        0
      );
    }
  }

  /**
   * Parse error message from response
   */
  async parseErrorMessage(response) {
    try {
      const data = await response.json();
      return data.message || data.error || `Request failed with status ${response.status}`;
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

export const sessionApi = {
  /**
   * Fetch mini view data (session summaries)
   */
  async getMiniView(limit = 200, range = "year") {
    return apiClient.get(endpoints.miniView, { limit, range });
  },

  /**
   * Fetch EMS transactions
   */
  async getEmsTransactions(limit = 200) {
    return apiClient.get(endpoints.emsTransactions, { limit });
  },
};

export default apiClient;
