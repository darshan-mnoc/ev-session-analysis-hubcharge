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

export const sessionApi = {
  /**
   * Fetch mini view data (session summaries)
   */
  async getMiniView(range = "year", onProgress = null) {
    return fetchAllDataAdaptive(endpoints.miniView, { range }, onProgress);
  },

  /**
   * Fetch EMS transactions
   */
  async getEmsTransactions(onProgress = null) {
    return fetchAllDataAdaptive(endpoints.emsTransactions, {}, onProgress);
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
 * Fetch all data by finding the max working limit
 * API only works when limit <= actual record count
 * Uses binary search after initial probe to minimize API calls
 */
// async function fetchAllDataAdaptive(endpoint, baseParams = {}, onProgress = null) {
//   if (onProgress) onProgress("Loading...");

//   // Step 1: Try 200 first
//   let result = await tryFetchWithLimit(endpoint, baseParams, 200, onProgress);
//   if (!result.success) {
//     return [];
//   }

//   let lastGoodData = result.data;
//   let lastGoodLimit = 200;

//   // Step 2: Try 400
//   result = await tryFetchWithLimit(endpoint, baseParams, 400, onProgress);
//   if (result.success) {
//     lastGoodData = result.data;
//     lastGoodLimit = 400;

//     // Step 3: Try 600
//     result = await tryFetchWithLimit(endpoint, baseParams, 600, onProgress);
//     if (result.success) {
//       lastGoodData = result.data;
//       lastGoodLimit = 600;

//       // Continue with bigger jumps
//       for (let limit = 800; limit <= 5000; limit += 200) {
//         result = await tryFetchWithLimit(endpoint, baseParams, limit, onProgress);
//         if (result.success) {
//           lastGoodData = result.data;
//           lastGoodLimit = limit;
//         } else {
//           break;
//         }
//       }
//     }
//   }

//   // Step 4: Refine - try increments of 50 from lastGoodLimit
//   for (let limit = lastGoodLimit + 50; limit < lastGoodLimit + 200; limit += 50) {
//     result = await tryFetchWithLimit(endpoint, baseParams, limit, onProgress);
//     if (result.success) {
//       lastGoodData = result.data;
//     } else {
//       break;
//     }
//   }

//   console.log(`✓ Fetched ${lastGoodData.length} records`);
//   return lastGoodData;
// }

/**
 * Fetch all data using cascading step-down refinement.
 *
 * Steps: [200, 100, 50, 40, 30, 20, 10, 5, 1]
 * - If probe succeeds → advance lastGood, retry same step
 * - If probe fails    → record ceiling, shrink step, retry from lastGood
 * - Skip any probe that would hit/exceed a known ceiling (saves calls)
 *
 * Example for ~394 records:
 *   step=200: 200✓ 400✗           → lastGood=200, ceil=400
 *   step=100: 300✓ skip(400≥ceil) → lastGood=300
 *   step= 50: 350✓ skip(400≥ceil) → lastGood=350
 *   step= 40: 390✓ skip(430>ceil) → lastGood=390
 *   step= 30: skip(420>ceil)
 *   step= 20: skip(410>ceil)
 *   step= 10: skip(400≥ceil)
 *   step=  5: 395✗               → ceil=395
 *   step=  1: 391✓ 392✓ 393✓ 394✓ skip(395≥ceil)
 *   ✓ 394 records in ~10 API calls
 */
async function fetchAllDataAdaptive(
  endpoint,
  baseParams = {},
  onProgress = null,
) {
  if (onProgress) onProgress("Loading...");

  // const STEPS = [200, 100, 50, 40, 30, 20, 10, 5, 1];
  const STEPS = [200, 100, 50];

  // ── Initial probe ────────────────────────────────────────────────────────
  const initial = await tryFetchWithLimit(
    endpoint,
    baseParams,
    STEPS[0],
    onProgress,
  );
  if (!initial.success) {
    console.warn(
      "Initial probe at 200 failed — dataset may be empty or API error.",
    );
    return [];
  }

  let lastGoodData = initial.data;
  let lastGoodLimit = STEPS[0]; // 200
  let ceilLimit = 500; // lowest known failing limit

  // ── Cascading refinement ─────────────────────────────────────────────────
  for (const step of STEPS) {
    // Keep probing with this step until we hit the ceiling
    while (true) {
      const next = lastGoodLimit + step;

      // Skip — we already know this limit (or higher) fails
      if (next >= ceilLimit) break;

      const result = await tryFetchWithLimit(
        endpoint,
        baseParams,
        next,
        onProgress,
      );

      if (result.success) {
        lastGoodData = result.data;
        lastGoodLimit = next;
        // Continue with same step (maybe there's more room)
      } else {
        ceilLimit = next; // tighten the ceiling for all future steps too
        break; // shrink step
      }
    }

    // Once the gap is closed, no finer steps can help
    if (ceilLimit - lastGoodLimit <= 1) break;
  }

  console.log(`✓ Fetched ${lastGoodData.length} records in exact mode`);
  return lastGoodData;
}

/**
 * Try to fetch with a specific limit, returns { success, data }
 */
async function tryFetchWithLimit(
  endpoint,
  baseParams,
  limit,
  onProgress = null,
) {
  try {
    // if (onProgress) onProgress(`Trying ${limit}...`);
    const params = { ...baseParams, limit, offset: 0 };
    const response = await apiClient.get(endpoint, params);
    const data = parseResponseData(response);
    return { success: data.length > 0, data };
  } catch {
    return { success: false, data: [] };
  }
}

export default apiClient;
