/**
 * Custom hook for fetching meter data from Green Button API
 * Compares grid energy (gbkWh) with session discharge energy
 */

import { useState, useEffect, useMemo } from "react";

// Billing cycles configuration
const BILLING_CYCLES = [
  {
    label: "Feb 18, 2026 – Feb 27, 2026",
    startDate: "2026-02-18",
    endDate: "2026-02-27",
  },
  {
    label: "Feb 28, 2026 – Mar 27, 2026",
    startDate: "2026-02-28",
    endDate: "2026-03-27",
  },
];

// API configuration
const METER_API_BASE =
  "https://script.google.com/macros/s/AKfycbxEK3S0EH2h-LzUF-N6RBpFmWAHuFnxmCjf-LfQZQb4hs42Wu6Bx4nuAhPbIgpA2BZO/exec";
const API_KEY = "72125bff3c984275973cbaa487e35f3a";
const DATA_EX_ID = "exe_10288";

/**
 * Convert date string to Unix timestamp at specified hour in PST
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} hourPST - Hour in PST (0-23), default 11 for start dates
 * @returns {number} Unix timestamp in seconds
 */
function dateToUnixPST(dateStr, hourPST = 0) {
  // Parse date as PST (UTC-8)
  const [year, month, day] = dateStr.split("-").map(Number);
  // Convert PST hour to UTC (PST + 8 = UTC)
  const hourUTC = hourPST + 8;
  const date = new Date(Date.UTC(year, month - 1, day, hourUTC, 0, 0));
  return Math.floor(date.getTime() / 1000);
}

/**
 * Fetch meter data for a billing cycle
 */
async function fetchMeterData(startDate, endDate) {
  // Use 12AM PST for start date
  const startInterval = dateToUnixPST(startDate, 0);
  // Use 12PM (noon) PST for end date
  const endInterval = dateToUnixPST(endDate, 12);

  const url = new URL(METER_API_BASE);
  url.searchParams.append("dataExId", DATA_EX_ID);
  url.searchParams.append("startInterval", startInterval);
  url.searchParams.append("endInterval", endInterval);
  url.searchParams.append("apiKey", API_KEY);
  url.searchParams.append("scope", "meterData");

  try {
    const response = await fetch(url.toString());
    const result = await response.json();

    if (result.status === "success" && result.data) {
      console.log("Meter Data::", result.data);
      return result.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching meter data:", error);
    return [];
  }
}

/**
 * Calculate total discharge kWh from meter data
 * diskWh values are negative (e.g., -0.15 = 15 kWh discharge)
 * Formula: |diskWh| * 100 = actual kWh
 */
function calculateTotalDiskWh(meterData) {
  if (!meterData || meterData.length === 0) return 0;

  let total = 0;
  let validCount = 0;

  for (const entry of meterData) {
    // Skip null, "NULL", undefined, or non-numeric values
    if (
      entry.diskWh === null ||
      entry.diskWh === "NULL" ||
      entry.diskWh === undefined ||
      entry.diskWh === ""
    ) {
      continue;
    }

    const value = parseFloat(entry.diskWh);

    // Only process negative values (discharge) and convert to kWh
    // -0.15 means 15 kWh, so multiply absolute value by 100
    if (!isNaN(value) && value < 0) {
      const kWh = Math.abs(value);
      total += kWh;
      validCount++;
    }
  }

  console.log(
    `Discharge: ${validCount} readings, total: ${total.toFixed(2)} kWh`,
  );
  return total;
}

/**
 * Calculate total session kWh within a date range
 */
function calculateSessionKwh(sessions, startDate, endDate) {
  if (!sessions || sessions.length === 0) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include full end day

  return sessions
    .filter((session) => {
      const sessionDate = new Date(session.start_time);
      return sessionDate >= start && sessionDate <= end;
    })
    .reduce((total, session) => {
      return total + (session.total_kwh || 0);
    }, 0);
}

/**
 * Hook for billing cycle meter data
 */
export function useMeterData(sessions) {
  const [meterData, setMeterData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch meter data for all billing cycles
  useEffect(() => {
    async function fetchAllCycles() {
      setLoading(true);
      setError(null);

      try {
        const results = {};

        for (const cycle of BILLING_CYCLES) {
          const data = await fetchMeterData(cycle.startDate, cycle.endDate);
          const totalDiskWh = calculateTotalDiskWh(data);

          results[cycle.label] = {
            ...cycle,
            meterData: data,
            totalDiskWh,
            dataPoints: data.length,
          };
        }

        setMeterData(results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAllCycles();
  }, []);

  // Calculate billing stats combining meter data and session data
  const billingStats = useMemo(() => {
    if (loading || !sessions || sessions.length === 0) return null;

    const cycles = BILLING_CYCLES.map((cycle) => {
      const cycleData = meterData[cycle.label] || {};
      const gridKwh = cycleData.totalDiskWh || 0;
      const sessionKwh = calculateSessionKwh(
        sessions,
        cycle.startDate,
        cycle.endDate,
      );

      // Calculate ratio (session discharge / grid energy)
      const ratio = gridKwh > 0 ? (sessionKwh / gridKwh) * 100 : 0;

      return {
        label: cycle.label,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        gridKwh,
        sessionKwh,
        ratio,
        dataPoints: cycleData.dataPoints || 0,
      };
    });

    // Calculate totals
    const totalGridKwh = cycles.reduce((sum, c) => sum + c.gridKwh, 0);
    const totalSessionKwh = cycles.reduce((sum, c) => sum + c.sessionKwh, 0);
    const totalRatio =
      totalGridKwh > 0 ? (totalSessionKwh / totalGridKwh) * 100 : 0;

    return {
      cycles,
      totals: {
        gridKwh: totalGridKwh,
        sessionKwh: totalSessionKwh,
        ratio: totalRatio,
      },
    };
  }, [meterData, sessions, loading]);

  return {
    billingStats,
    loading,
    error,
  };
}

export default useMeterData;
