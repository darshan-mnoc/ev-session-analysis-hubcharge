/**
 * Custom hook for fetching and managing session data
 *
 * Load order:
 *  1. Check IndexedDB cache → if hit, render sessions instantly (<100ms)
 *     then silently refresh in background.
 *  2. Cache miss → fetch mini_view → reveal dashboard → fetch EMS (concurrent
 *     batches of 4) → process once → save to cache → single re-render.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiClient, sessionApi, ApiError } from "../api/apiClient";
import { useAuth } from "../AuthContext";
import { getCachedSessions, setCachedSessions, clearSessionCache } from "../lib/sessionCache";
import {
  getMachineInfo,
  normalizeMachineType,
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
    user,
  } = useAuth();

  const hasFetchedRef = useRef(false);
  const miniViewRef = useRef([]); // raw mini_view rows (not state — no mid-load renders)
  const emsRef = useRef([]);     // raw EMS rows (accumulates silently)

  // `data` is set directly — either from cache or after processing. No useMemo needed.
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [firstChunkReady, setFirstChunkReady] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.init({ getAuthHeader, onUnauthorized: handleUnauthorized });
  }, [getAuthHeader, handleUnauthorized]);

  // ─── processSessionData ────────────────────────────────────────────────────

  const processSessionData = useCallback((miniViewArray, emsArray) => {
    const filteredSessions = miniViewArray.filter(
      (row) =>
        parseInt(row.duration_minutes) >= 10 &&
        row.final_cost >= 12.5 &&
        row.is_refunded !== true &&
        row.session_id !== "45135982-e3d4-4807-b382-74f1b9222677" &&
        row.session_id !== "8c9fe7d1-65ee-426b-bf01-869d418fa9f5",
    );

    const emsMapByTxId = new Map();
    emsArray.forEach((ems) => {
      if (ems.transaction_id) emsMapByTxId.set(ems.transaction_id, ems);
    });

    const mergedSessions = filteredSessions
      .map((session) => {
        const ems = emsMapByTxId.get(session.raw_transaction_id);
        const machineInfo = getMachineInfo(session.cpid, session.connector_id);

        const socStart = session.soc_start || ems?.summary?.startSocPercent || 0;
        const socEnd = session.soc_end || ems?.summary?.endSocPercent || 0;
        const socGain = socEnd - socStart;
        const totalKwh = session.total_kwh || ems?.summary?.totalKwh || 0;
        const averageKw = session.average_kw || ems?.summary?.averageKw || 0;
        const durationMin = session.duration_minutes || 0;

        const rawBuckets = ems?.minute_buckets || [];
        const buckets = processBuckets(rawBuckets);

        let avgVoltage = 0;
        let avgCurrent = 0;
        if (buckets.length > 0) {
          avgVoltage = buckets.reduce((s, b) => s + (b.avgVoltageV || 0), 0) / buckets.length;
          avgCurrent = buckets.reduce((s, b) => s + (b.avgCurrentA || 0), 0) / buckets.length;
        }

        const voltageArch = calculateVoltageArch(buckets, session.cpid, averageKw);
        const kwh10Min = calculateKwh10Min(buckets, durationMin, totalKwh);
        const kw10Min = calculateKw10Min(buckets, durationMin, averageKw);
        const soc10MinGain = calculateSoc10MinGain(buckets, durationMin, socStart, socEnd);

        const first10Buckets = buckets.slice(0, 10);
        let soc10MinStart = socStart;
        let soc10MinEnd = socStart;
        if (parseInt(durationMin) === 10) {
          soc10MinStart = socStart;
          soc10MinEnd = socEnd;
        } else if (first10Buckets.length > 0) {
          soc10MinStart = first10Buckets[0]?.socPercent || socStart;
          soc10MinEnd = first10Buckets[first10Buckets.length - 1]?.socPercent || soc10MinStart;
        }

        return {
          session_id: session.session_id?.slice(0, 8) || "N/A",
          full_id: session.session_id || "N/A",
          raw_transaction_id: session.raw_transaction_id,
          ...machineInfo,
          machine_type: normalizeMachineType(machineInfo.machine_type),
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
          ems_site: ems?.ems_site || session.ems_site || "hc-mbs (Without EMS Bucket Data)",
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
        (s) => !isNaN(s.soc_gain) && s.soc_gain !== null && !s.is_refunded,
      );

    mergedSessions.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    return mergedSessions;
  }, []);

  // ─── core fetch ───────────────────────────────────────────────────────────

  const doFetch = useCallback(async () => {
    miniViewRef.current = [];
    emsRef.current = [];
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressStatus("Loading sessions...");

    try {
      // Step 1: mini_view (fast — usually 1 page)
      setProgress(5);
      const miniView = await sessionApi.getMiniView("year", {
        onProgress: ({ fraction }) => {
          setProgress(5 + Math.round(fraction * 30));
        },
      });
      miniViewRef.current = miniView;

      // Reveal dashboard with session list immediately — no EMS needed for list
      const partial = processSessionData(miniView, []);
      setData(partial);
      setProgress(35);
      setFirstChunkReady(true);
      setLoading(false);
      setBackgroundLoading(true);
      setProgressStatus("Loading chart data");

      // Step 2: EMS — concurrent 4-at-a-time, accumulated in ref (zero re-renders)
      await sessionApi.getEmsTransactions({
        onProgress: ({ fraction }) => {
          setProgress(35 + Math.round(fraction * 63));
        },
        onPage: (rows) => {
          emsRef.current = emsRef.current.concat(rows);
        },
      });

      // Step 3: Process once with full data — single re-render
      const processed = processSessionData(miniViewRef.current, emsRef.current);
      setData(processed);
      setProgress(100);
      console.log(`✓ Processed ${processed.length} sessions`);

      // Step 4: Save to IndexedDB (non-blocking — doesn't delay the render)
      setCachedSessions(user?.id, processed).then(() => {
        console.log(`✓ Cached ${processed.length} sessions for 4 hours`);
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err.message || "Unexpected error"));
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  }, [processSessionData, user?.id]);

  // ─── fetchData: cache-first ───────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setFirstChunkReady(false);
    setBackgroundLoading(false);

    // Check IndexedDB cache first
    const cached = await getCachedSessions(user?.id);

    if (cached && cached.length > 0) {
      // Cache hit — render instantly and stop. TTL handles staleness.
      // User can hit the refresh button for fresh data at any time.
      console.log(`✓ Cache hit: ${cached.length} sessions`);
      setData(cached);
      setLoading(false);
      setFirstChunkReady(true);
      setBackgroundLoading(false);
    } else {
      // Cache miss or expired — full fetch
      doFetch();
    }
  }, [doFetch, user?.id]);

  // ─── refreshData: bypass cache ────────────────────────────────────────────

  const refreshData = useCallback(() => {
    clearSessionCache(user?.id);
    hasFetchedRef.current = true;
    miniViewRef.current = [];
    emsRef.current = [];
    setData([]);
    setFirstChunkReady(false);
    doFetch();
  }, [doFetch, user?.id]);

  // ─── auto-fetch ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (hasApiAccess && !authLoading && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData();
    }
  }, [hasApiAccess, authLoading, fetchData]);

  return {
    data,
    loading,
    firstChunkReady,
    backgroundLoading,
    progress,
    progressStatus,
    error,
    refreshData,
  };
};

// ─── useFilteredData ──────────────────────────────────────────────────────────

export const useFilteredData = (data, filters, rangeFilters) => {
  const {
    durationMin, durationMax, priceFilter, socMin, socMax,
    extensionMin, extensionMax, startDate, endDate, kwhMin, kwhMax,
    costPerKwhMin, costPerKwhMax,
  } = rangeFilters;

  return useMemo(() => {
    return data.filter((session) => {
      if (filters.site !== "all" && session.ems_site !== filters.site) return false;
      if (filters.machineType !== "all" && normalizeMachineType(session.machine_type) !== filters.machineType) return false;
      if (filters.connectorType !== "all" && session.connector_type !== filters.connectorType) return false;
      if (filters.cpid !== "all" && session.cpid !== filters.cpid) return false;
      if (filters.status !== "all" && session.status !== filters.status) return false;
      if (filters.voltageArch !== "all" && session.voltage_arch !== filters.voltageArch) return false;

      const sessionMins = session.duration_minutes || 0;
      if (durationMin !== "" && sessionMins < Number(durationMin)) return false;
      if (durationMax !== "" && sessionMins > Number(durationMax)) return false;

      if (priceFilter !== "all") {
        const sessionPrice = session.final_cost || 0;
        if (Number(sessionPrice.toFixed(2)) !== Number(Number(priceFilter).toFixed(2))) return false;
      }

      const sessionSocStart = session.soc_start || 0;
      if (socMin !== "" && sessionSocStart < Number(socMin)) return false;
      if (socMax !== "" && sessionSocStart > Number(socMax)) return false;

      const sessionExtensions = session.extension_count || 0;
      if (extensionMin !== "" && sessionExtensions < Number(extensionMin)) return false;
      if (extensionMax !== "" && sessionExtensions > Number(extensionMax)) return false;

      if (startDate || endDate) {
        const sessionDate = session.start_time ? new Date(session.start_time) : null;
        if (!sessionDate) return false;
        if (startDate && sessionDate < new Date(startDate + "T00:00:00")) return false;
        if (endDate && sessionDate > new Date(endDate + "T23:59:59.999")) return false;
      }

      const sessionKwh = session.total_kwh || 0;
      if (kwhMin !== "" && sessionKwh < Number(kwhMin)) return false;
      if (kwhMax !== "" && sessionKwh > Number(kwhMax)) return false;

      if (costPerKwhMin !== "" || costPerKwhMax !== "") {
        const costPerKwh = sessionKwh > 0 ? (session.final_cost || 0) / sessionKwh : 0;
        if (costPerKwhMin !== "" && costPerKwh < Number(costPerKwhMin)) return false;
        if (costPerKwhMax !== "" && costPerKwh > Number(costPerKwhMax)) return false;
      }

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
    data, filters, durationMin, durationMax, priceFilter, socMin, socMax,
    extensionMin, extensionMax, startDate, endDate, kwhMin, kwhMax,
    costPerKwhMin, costPerKwhMax,
  ]);
};

export default useSessionData;
