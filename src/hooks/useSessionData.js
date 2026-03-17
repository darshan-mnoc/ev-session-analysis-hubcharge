/**
 * Custom hook for fetching and managing session data
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiClient, sessionApi, ApiError } from "../api/apiClient";
import { useAuth } from "../AuthContext";
import {
  getMachineInfo,
  processBuckets,
  calculateVoltageArch,
  calculateKwh10Min,
  calculateKw10Min,
  calculateSoc10MinGain,
} from "../utils/helpers";

export const useSessionData = () => {
  const {
    hasApiAccess,
    isLoading: authLoading,
    handleUnauthorized,
    getAuthHeader,
  } = useAuth();

  const hasFetchedRef = useRef(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [error, setError] = useState(null);

  // Initialize API client with auth
  useEffect(() => {
    apiClient.init({ getAuthHeader, onUnauthorized: handleUnauthorized });
  }, [getAuthHeader, handleUnauthorized]);

  /**
   * Process and merge session data with EMS transactions
   */
  const processSessionData = useCallback((miniViewArray, emsArray) => {
    // Filter sessions >= 10 minutes with minimum cost
    const filteredSessions = miniViewArray.filter(
      (row) =>
        parseInt(row.duration_minutes) >= 10 &&
        row.final_cost >= 12.5 &&
        row.is_refunded !== true &&
        row.session_id !== "45135982-e3d4-4807-b382-74f1b9222677" &&
        row.session_id !== "8c9fe7d1-65ee-426b-bf01-869d418fa9f5",
    );

    // Create EMS lookup map
    const emsMapByTxId = new Map();
    emsArray.forEach((ems) => {
      if (ems.transaction_id) {
        emsMapByTxId.set(ems.transaction_id, ems);
      }
    });

    // Merge and process sessions
    const mergedSessions = filteredSessions
      .map((session) => {
        const ems = emsMapByTxId.get(session.raw_transaction_id);
        const machineInfo = getMachineInfo(session.cpid, session.connector_id);

        // Calculate SOC values
        const socStart =
          session.soc_start || ems?.summary?.startSocPercent || 0;
        const socEnd = session.soc_end || ems?.summary?.endSocPercent || 0;
        const socGain = socEnd - socStart;

        // Get energy and power values
        const totalKwh = session.total_kwh || ems?.summary?.totalKwh || 0;
        const averageKw = session.average_kw || ems?.summary?.averageKw || 0;
        const durationMin = session.duration_minutes || 0;

        // Process minute buckets
        const rawBuckets = ems?.minute_buckets || [];
        const buckets = processBuckets(rawBuckets);

        // Calculate average voltage and current
        let avgVoltage = 0;
        let avgCurrent = 0;
        if (buckets.length > 0) {
          avgVoltage =
            buckets.reduce((sum, b) => sum + (b.avgVoltageV || 0), 0) /
            buckets.length;
          avgCurrent =
            buckets.reduce((sum, b) => sum + (b.avgCurrentA || 0), 0) /
            buckets.length;
        }

        // Calculate voltage architecture
        const voltageArch = calculateVoltageArch(
          buckets,
          session.cpid,
          averageKw,
        );

        // Calculate 10-min metrics
        const kwh10Min = calculateKwh10Min(buckets, durationMin, totalKwh);
        const kw10Min = calculateKw10Min(buckets, durationMin, averageKw);
        const soc10MinGain = calculateSoc10MinGain(
          buckets,
          durationMin,
          socStart,
          socEnd,
        );

        // Calculate SOC at 10 min
        const first10Buckets = buckets.slice(0, 10);
        let soc10MinStart = socStart;
        let soc10MinEnd = socStart;
        if (parseInt(durationMin) === 10) {
          soc10MinStart = socStart;
          soc10MinEnd = socEnd;
        } else if (first10Buckets.length > 0) {
          soc10MinStart = first10Buckets[0]?.socPercent || socStart;
          soc10MinEnd =
            first10Buckets[first10Buckets.length - 1]?.socPercent ||
            soc10MinStart;
        }

        return {
          session_id: session.session_id?.slice(0, 8) || "N/A",
          full_id: session.session_id || "N/A",
          raw_transaction_id: session.raw_transaction_id,
          ...machineInfo,
          cpid: session.cpid || "unknown",
          connector_id: session.connector_id || 0,
          duration_minutes: durationMin,
          base_duration: durationMin,
          extension_minutes: Number(session.extension_minutes) || 0,
          extension_count: Number(session.extensions_count) || 0,
          soc_start: socStart,
          soc_end: socEnd,
          soc_gain: socGain,
          total_kwh: totalKwh,
          average_kw: averageKw,
          final_cost: session.final_cost || 0,
          status: session.status || "unknown",
          ems_site:
            ems?.ems_site ||
            session.ems_site ||
            "hc-mbs (Without EMS Bucket Data)",
          start_time: session.start_time || ems?.ems_start_time_utc || "",
          end_time: session.end_time || ems?.ems_end_time_utc || "",
          participant_label: session.participant_label || "N/A",
          user_full_name: session.user_full_name || "N/A",
          ev_capacity_kwh: session.ev_capacity_kwh || 0,
          buckets,
          voltage_arch: voltageArch,
          avg_voltage: avgVoltage,
          avg_current: avgCurrent,
          kwh_10_min: kwh10Min,
          kw_10_min: kw10Min,
          soc_10_min_start: soc10MinStart,
          soc_10_min_end: soc10MinEnd,
          soc_10_min_gain: soc10MinGain,
          is_refunded: session.is_refunded,
          session_note: session.session_note || "",
          stop_reason: session.stop_reason || "",
        };
      })
      .filter(
        (session) =>
          !isNaN(session.soc_gain) &&
          session.soc_gain !== null &&
          !session.is_refunded,
      );

    // Filter to only sessions with bucket data and sort by start time
    const sessionsWithBuckets = mergedSessions.filter(
      (s) => s.buckets && s.buckets.length > 0,
    );
    sessionsWithBuckets.sort(
      (a, b) => new Date(b.start_time) - new Date(a.start_time),
    );

    return sessionsWithBuckets;
  }, []);

  /**
   * Fetch all session data
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Fetch mini_view data with adaptive limit
      setProgressStatus("Fetching session data...");
      setProgress(10);

      const miniViewData = await sessionApi.getMiniView("year", (status) => {
        setProgressStatus(`Sessions: ${status}`);
      });
      setProgress(45);
      console.log("Mini view sessions loaded:", miniViewData.length);

      // Step 2: Fetch EMS transactions with adaptive limit
      setProgressStatus("Fetching EMS transactions...");
      setProgress(50);

      const emsData = await sessionApi.getEmsTransactions((status) => {
        setProgressStatus(`EMS: ${status}`);
      });
      setProgress(80);

      const emsArray = Array.isArray(emsData) ? emsData : [];
      console.log("EMS transactions loaded:", emsArray.length);

      // Step 3: Process and merge data
      setProgressStatus("Processing data...");
      setProgress(85);
      const processedData = processSessionData(miniViewData, emsArray);

      setProgress(100);
      setData(processedData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, [processSessionData]);

  /**
   * Refresh data - clears old data and fetches fresh
   */
  const refreshData = useCallback(() => {
    // Clear existing data to ensure fresh fetch
    setData([]);
    // Mark as fetched to prevent useEffect from also triggering
    hasFetchedRef.current = true;
    // Fetch new data
    fetchData();
  }, [fetchData]);

  // Auto-fetch when authenticated and API access verified
  useEffect(() => {
    if (hasApiAccess && !authLoading && !hasFetchedRef.current && !loading) {
      hasFetchedRef.current = true;
      fetchData();
    }
  }, [hasApiAccess, authLoading, loading, fetchData]);

  return {
    data,
    loading,
    progress,
    progressStatus,
    error,
    refreshData,
  };
};

/**
 * Hook for filtering session data
 */
export const useFilteredData = (data, filters, rangeFilters) => {
  const {
    durationMin,
    durationMax,
    priceFilter,
    socFilter,
    extensionMin,
    extensionMax,
    startDate,
    endDate,
    kwhMin,
    kwhMax,
    costPerKwhMin,
    costPerKwhMax,
  } = rangeFilters;

  return useMemo(() => {
    return data.filter((session) => {
      // Basic filters
      if (filters.site !== "all" && session.ems_site !== filters.site)
        return false;
      if (
        filters.machineType !== "all" &&
        session.machine_type !== filters.machineType
      )
        return false;
      if (
        filters.connectorType !== "all" &&
        session.connector_type !== filters.connectorType
      )
        return false;
      if (filters.cpid !== "all" && session.cpid !== filters.cpid) return false;
      if (filters.status !== "all" && session.status !== filters.status)
        return false;
      if (
        filters.voltageArch !== "all" &&
        session.voltage_arch !== filters.voltageArch
      )
        return false;

      // Duration filter
      const sessionMins = session.duration_minutes || 0;
      if (durationMin !== "" && sessionMins < Number(durationMin)) return false;
      if (durationMax !== "" && sessionMins > Number(durationMax)) return false;

      // Price filter
      if (priceFilter !== "all") {
        const sessionPrice = session.final_cost || 0;
        const filterPrice = Number(priceFilter);
        if (Number(sessionPrice.toFixed(2)) !== Number(filterPrice.toFixed(2)))
          return false;
      }

      // SOC filter
      if (socFilter !== "all") {
        const sessionSocStart = session.soc_start || 0;
        if (sessionSocStart > Number(socFilter)) return false;
      }

      // Extension filter
      const sessionExtensions = session.extension_count || 0;
      if (extensionMin !== "" && sessionExtensions < Number(extensionMin))
        return false;
      if (extensionMax !== "" && sessionExtensions > Number(extensionMax))
        return false;

      // Date range filter
      if (startDate || endDate) {
        const sessionDate = session.start_time
          ? new Date(session.start_time)
          : null;
        if (!sessionDate) return false;

        if (startDate) {
          // Parse as local time by appending T00:00:00
          const start = new Date(startDate + "T00:00:00");
          if (sessionDate < start) return false;
        }

        if (endDate) {
          // Parse as local time and set to end of day
          const end = new Date(endDate + "T23:59:59.999");
          if (sessionDate > end) return false;
        }
      }

      // kWh range filter (outlier filter)
      const sessionKwh = session.total_kwh || 0;
      if (kwhMin !== "" && sessionKwh < Number(kwhMin)) return false;
      if (kwhMax !== "" && sessionKwh > Number(kwhMax)) return false;

      // $/kWh range filter (outlier filter)
      if (costPerKwhMin !== "" || costPerKwhMax !== "") {
        const sessionCost = session.final_cost || 0;
        const costPerKwh = sessionKwh > 0 ? sessionCost / sessionKwh : 0;
        if (costPerKwhMin !== "" && costPerKwh < Number(costPerKwhMin))
          return false;
        if (costPerKwhMax !== "" && costPerKwh > Number(costPerKwhMax))
          return false;
      }

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          session.session_id.toLowerCase().includes(search) ||
          session.cpid.toLowerCase().includes(search) ||
          session.participant_label?.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [
    data,
    filters,
    durationMin,
    durationMax,
    priceFilter,
    socFilter,
    extensionMin,
    extensionMax,
    startDate,
    endDate,
    kwhMin,
    kwhMax,
    costPerKwhMin,
    costPerKwhMax,
  ]);
};

export default useSessionData;
