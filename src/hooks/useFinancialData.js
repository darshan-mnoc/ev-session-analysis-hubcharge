/**
 * Custom hooks for Financial Insights Dashboard
 * Provides real-time and historical session data with proper date handling
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../AuthContext";
import { apiClient, sessionApi } from "../api/apiClient";
import {
  EBE_MODEL,
  CHARGERS,
  getProjectedSessions,
  getProjectedKwh,
  getProjectedRevenue,
  calculateBlendedRate,
  calculateUtilizationRate,
} from "../constants/ebeModel";
import {
  calculateIRR,
  generateCashFlows,
  calculateIRRTrajectory,
  generateBaselineIRRTrajectory,
  calculatePaybackPeriod,
  calculateExtensionOptimizationImpact,
  calculateSessionsImpact,
} from "../utils/irr";
import {
  getMachineInfo,
  normalizeMachineType,
  processBuckets,
} from "../utils/helpers";

// ========== DATE UTILITIES ==========

/**
 * Format date as "Mon DD" (e.g., "Jan 15")
 */
const formatShortDate = (date) => {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Format date as "Mon DD, YYYY"
 */
const formatFullDate = (date) => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Get week number of the year
 */
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

/**
 * Get start of day
 */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get start of week (Sunday)
 */
const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get start of month
 */
const startOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// ========== LIVE SESSION DATA HOOK ==========

/**
 * Hook for live session data (polling every 15 seconds)
 */
export const useLiveSessionData = (pollInterval = 15000) => {
  const { hasApiAccess, getAuthHeader, handleUnauthorized } = useAuth();
  const [liveData, setLiveData] = useState({
    chargers: CHARGERS.map((c) => ({
      ...c,
      status: "AVAILABLE",
      currentKwh: 0,
      sessionStartTime: null,
      sessionRevenue: 0,
      isActive: false,
    })),
    todayRevenue: 0,
    todaySessions: 0,
    todayKwh: 0,
    activeCount: 0,
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchLiveData = useCallback(async () => {
    if (!hasApiAccess) return;

    try {
      const today = startOfDay(new Date());

      const response = await apiClient.get("/views/mini_view", {
        range: "week",
        limit: 100,
      });

      const sessions = Array.isArray(response)
        ? response
        : response.rows || response.data || [];

      // Filter today's sessions
      const todaySessions = sessions.filter((s) => {
        const sessionDate = new Date(s.start_time);
        return sessionDate >= today;
      });

      // Calculate totals
      const todayRevenue = todaySessions.reduce(
        (sum, s) => sum + (s.final_cost || 0),
        0,
      );
      const todayKwh = todaySessions.reduce(
        (sum, s) => sum + (s.total_kwh || 0),
        0,
      );

      // Determine active sessions
      const now = new Date();
      const activeSessionsData = sessions.filter((s) => {
        if (s.status === "charging") return true;
        if (!s.end_time && s.start_time) {
          const startTime = new Date(s.start_time);
          const minutesAgo = (now - startTime) / 60000;
          return minutesAgo < 120;
        }
        return false;
      });

      // Map charger statuses
      const chargerData = CHARGERS.map((charger) => {
        const activeSession = activeSessionsData.find(
          (s) => s.cpid === charger.cpid,
        );

        if (activeSession) {
          const startTime = new Date(activeSession.start_time);
          const elapsedMinutes = (now - startTime) / 60000;
          const estimatedKwh =
            activeSession.total_kwh ||
            (activeSession.average_kw || 50) * (elapsedMinutes / 60);
          const estimatedRevenue =
            activeSession.final_cost ||
            estimatedKwh * EBE_MODEL.evCharging.blendedEvRate;

          return {
            ...charger,
            status: "CHARGING",
            currentKwh: estimatedKwh,
            sessionStartTime: startTime,
            sessionRevenue: estimatedRevenue,
            isActive: true,
            sessionId: activeSession.session_id,
          };
        }

        return {
          ...charger,
          status: "AVAILABLE",
          currentKwh: 0,
          sessionStartTime: null,
          sessionRevenue: 0,
          isActive: false,
        };
      });

      setLiveData({
        chargers: chargerData,
        todayRevenue,
        todaySessions: todaySessions.length,
        todayKwh,
        activeCount: chargerData.filter((c) => c.isActive).length,
        lastUpdated: new Date(),
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching live data:", error);
      setLoading(false);
    }
  }, [hasApiAccess]);

  // Initialize API client
  useEffect(() => {
    apiClient.init({ getAuthHeader, onUnauthorized: handleUnauthorized });
  }, [getAuthHeader, handleUnauthorized]);

  // Poll for live data
  useEffect(() => {
    if (hasApiAccess) {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, pollInterval);
      return () => clearInterval(interval);
    }
  }, [hasApiAccess, fetchLiveData, pollInterval]);

  return { liveData, loading, refresh: fetchLiveData };
};

// ========== SESSION SUMMARY HOOK ==========

/**
 * Hook for historical session data with period comparison
 */
export const useSessionSummary = () => {
  const { hasApiAccess, getAuthHeader, handleUnauthorized } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    apiClient.init({ getAuthHeader, onUnauthorized: handleUnauthorized });
  }, [getAuthHeader, handleUnauthorized]);

  useEffect(() => {
    if (!hasApiAccess || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchData = async () => {
      try {
        const response = await sessionApi.getMiniView("year");
        const sessions = Array.isArray(response) ? response : [];

        // Filter valid sessions
        const validSessions = sessions.filter(
          (s) =>
            parseInt(s.duration_minutes) >= 10 &&
            s.final_cost >= 12.5 &&
            !s.is_refunded,
        );

        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const yearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);

        // Process each period with proper date grouping
        const processedData = {
          weekly: processPeriodWithDates(
            validSessions.filter((s) => new Date(s.start_time) >= weekAgo),
            7,
            "daily",
            now,
          ),
          monthly: processPeriodWithDates(
            validSessions.filter((s) => new Date(s.start_time) >= monthAgo),
            30,
            "weekly",
            now,
          ),
          yearly: processPeriodWithDates(
            validSessions.filter((s) => new Date(s.start_time) >= yearAgo),
            365,
            "monthly",
            now,
          ),
          allSessions: validSessions,
          systemGoLiveDate: findEarliestSession(validSessions),
        };

        setData(processedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching session summary:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [hasApiAccess]);

  return { data, loading };
};

/**
 * Process sessions with proper date grouping
 */
const processPeriodWithDates = (sessions, days, groupBy, referenceDate) => {
  const totalSessions = sessions.length;
  const totalKwh = sessions.reduce((sum, s) => sum + (s.total_kwh || 0), 0);
  const totalRevenue = sessions.reduce(
    (sum, s) => sum + (s.final_cost || 0),
    0,
  );

  // Projected values
  const projectedSessions = getProjectedSessions(days);
  const projectedKwh = getProjectedKwh(days);
  const projectedRevenue = getProjectedRevenue(days);

  // Averages
  const avgRevenuePerSession =
    totalSessions > 0 ? totalRevenue / totalSessions : 0;
  const avgKwhPerSession = totalSessions > 0 ? totalKwh / totalSessions : 0;
  const projectedAvgRevenue =
    EBE_MODEL.evCharging.energyPerSession * EBE_MODEL.evCharging.blendedEvRate;
  const projectedAvgKwh = EBE_MODEL.evCharging.energyPerSession;

  // Rates
  const utilizationRate = calculateUtilizationRate(totalSessions, days);
  const projectedUtilization = calculateUtilizationRate(
    projectedSessions,
    days,
  );
  const blendedRate = calculateBlendedRate(totalRevenue, totalKwh);

  // Generate chart data with proper dates
  const chartData = generateChartDataWithDates(
    sessions,
    groupBy,
    referenceDate,
    days,
  );

  return {
    actual: {
      sessions: totalSessions,
      kwh: totalKwh,
      revenue: totalRevenue,
      avgRevenuePerSession,
      avgKwhPerSession,
      utilizationRate,
      blendedRate,
    },
    projected: {
      sessions: projectedSessions,
      kwh: projectedKwh,
      revenue: projectedRevenue,
      avgRevenuePerSession: projectedAvgRevenue,
      avgKwhPerSession: projectedAvgKwh,
      utilizationRate: projectedUtilization,
      blendedRate: EBE_MODEL.evCharging.blendedEvRate,
    },
    delta: {
      sessions:
        projectedSessions > 0
          ? ((totalSessions - projectedSessions) / projectedSessions) * 100
          : 0,
      kwh:
        projectedKwh > 0 ? ((totalKwh - projectedKwh) / projectedKwh) * 100 : 0,
      revenue:
        projectedRevenue > 0
          ? ((totalRevenue - projectedRevenue) / projectedRevenue) * 100
          : 0,
    },
    chartData,
    days,
    groupBy,
  };
};

/**
 * Generate chart data with proper date labels
 */
const generateChartDataWithDates = (sessions, groupBy, referenceDate, days) => {
  const now = referenceDate || new Date();
  const groups = new Map();

  // Initialize all date buckets
  if (groupBy === "daily") {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = startOfDay(date).toISOString();
      const label = formatShortDate(date);
      groups.set(key, {
        name: label,
        fullDate: formatFullDate(date),
        date: startOfDay(date),
        actualSessions: 0,
        actualKwh: 0,
        actualRevenue: 0,
        projectedSessions: EBE_MODEL.utilization.sessionsPerDayYear1to5,
        projectedKwh: EBE_MODEL.utilization.dailyDischargeYear1to5,
        projectedRevenue:
          EBE_MODEL.utilization.dailyDischargeYear1to5 *
          EBE_MODEL.evCharging.blendedEvRate,
      });
    }
  } else if (groupBy === "weekly") {
    // Last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = startOfWeek(weekEnd);
      const key = weekStart.toISOString();
      const label = `${formatShortDate(weekStart)} - ${formatShortDate(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}`;
      groups.set(key, {
        name: label,
        fullDate: label,
        date: weekStart,
        actualSessions: 0,
        actualKwh: 0,
        actualRevenue: 0,
        projectedSessions: EBE_MODEL.utilization.sessionsPerDayYear1to5 * 7,
        projectedKwh: EBE_MODEL.utilization.dailyDischargeYear1to5 * 7,
        projectedRevenue:
          EBE_MODEL.utilization.dailyDischargeYear1to5 *
          7 *
          EBE_MODEL.evCharging.blendedEvRate,
      });
    }
  } else if (groupBy === "monthly") {
    // Last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthDate.toISOString();
      const label = monthDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const daysInMonth = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      ).getDate();
      groups.set(key, {
        name: label,
        fullDate: label,
        date: monthDate,
        actualSessions: 0,
        actualKwh: 0,
        actualRevenue: 0,
        projectedSessions:
          EBE_MODEL.utilization.sessionsPerDayYear1to5 * daysInMonth,
        projectedKwh:
          EBE_MODEL.utilization.dailyDischargeYear1to5 * daysInMonth,
        projectedRevenue:
          EBE_MODEL.utilization.dailyDischargeYear1to5 *
          daysInMonth *
          EBE_MODEL.evCharging.blendedEvRate,
      });
    }
  }

  // Aggregate session data into buckets
  sessions.forEach((session) => {
    const sessionDate = new Date(session.start_time);
    let bucketKey;

    if (groupBy === "daily") {
      bucketKey = startOfDay(sessionDate).toISOString();
    } else if (groupBy === "weekly") {
      bucketKey = startOfWeek(sessionDate).toISOString();
    } else {
      bucketKey = startOfMonth(sessionDate).toISOString();
    }

    if (groups.has(bucketKey)) {
      const bucket = groups.get(bucketKey);
      bucket.actualSessions += 1;
      bucket.actualKwh += session.total_kwh || 0;
      bucket.actualRevenue += session.final_cost || 0;
    }
  });

  // Convert to array sorted by date
  return Array.from(groups.values()).sort((a, b) => a.date - b.date);
};

/**
 * Find earliest session date
 */
const findEarliestSession = (sessions) => {
  if (sessions.length === 0) return null;
  const dates = sessions.map((s) => new Date(s.start_time));
  return new Date(Math.min(...dates));
};

// ========== IRR PROJECTION HOOK ==========

/**
 * Hook for IRR projections and calculations
 */
export const useIRRProjection = (sessionData) => {
  return useMemo(() => {
    if (!sessionData?.allSessions || sessionData.allSessions.length === 0) {
      return {
        currentIRR: EBE_MODEL.targets.baselineIRR,
        irrDelta: 0,
        paybackPeriod: EBE_MODEL.targets.paybackYears,
        trajectoryData: [],
        baselineData: generateBaselineIRRTrajectory(),
        annualRevenueRunRate: 0,
        levers: {
          extensionOptimization: {
            irrDelta: 3.2,
            annualRevenueIncrease: 18000,
          },
          sessionsIncrease: 2.1,
          combined: EBE_MODEL.targets.baselineIRR + 5.3,
        },
      };
    }

    const { allSessions, systemGoLiveDate } = sessionData;

    // Calculate run rate
    const totalRevenue = allSessions.reduce(
      (sum, s) => sum + (s.final_cost || 0),
      0,
    );
    const daysOperating = systemGoLiveDate
      ? Math.max(1, (new Date() - systemGoLiveDate) / (24 * 60 * 60 * 1000))
      : 1;
    const annualRevenueRunRate = (totalRevenue / daysOperating) * 365;

    // Calculate IRR
    const cashFlows = generateCashFlows(annualRevenueRunRate);
    const currentIRR = calculateIRR(cashFlows) * 100;
    const irrDelta = currentIRR - EBE_MODEL.targets.baselineIRR;
    const paybackPeriod = calculatePaybackPeriod(cashFlows);

    // Trajectories
    const trajectoryData = calculateIRRTrajectory(annualRevenueRunRate);
    const baselineData = generateBaselineIRRTrajectory();

    // Lever impacts
    const sessionsPerYear = allSessions.length * (365 / daysOperating);
    const avgExtensions = 1.5;
    const extensionOptimization = calculateExtensionOptimizationImpact(
      annualRevenueRunRate,
      sessionsPerYear,
      avgExtensions,
    );

    const targetSessions = EBE_MODEL.utilization.sessionsPerDayYear6to20 * 365;
    const sessionsIncrease = calculateSessionsImpact(
      annualRevenueRunRate,
      sessionsPerYear,
      targetSessions,
    );

    const combinedRevenue =
      annualRevenueRunRate +
      extensionOptimization.annualRevenueIncrease +
      (targetSessions - sessionsPerYear) *
        (annualRevenueRunRate / Math.max(1, sessionsPerYear));
    const combinedIRR = calculateIRR(generateCashFlows(combinedRevenue)) * 100;

    return {
      currentIRR: Math.max(0, currentIRR),
      irrDelta,
      paybackPeriod,
      trajectoryData,
      baselineData,
      annualRevenueRunRate,
      levers: {
        extensionOptimization,
        sessionsIncrease,
        combined: combinedIRR,
      },
    };
  }, [sessionData]);
};

// ========== REVENUE WATERFALL HOOK ==========

/**
 * Hook for revenue waterfall calculations
 */
export const useRevenueWaterfall = (sessionData, period = "monthly") => {
  return useMemo(() => {
    if (!sessionData?.allSessions) {
      return {
        waterfallData: [],
        cumulativeCashFlow: 0,
        remainingToPayback: EBE_MODEL.incentives.netEffectiveCapex,
        netCapex: EBE_MODEL.incentives.netEffectiveCapex,
        paybackProgress: 0,
        period,
      };
    }

    const { allSessions, systemGoLiveDate } = sessionData;
    const daysOperating = systemGoLiveDate
      ? Math.max(1, (new Date() - systemGoLiveDate) / (24 * 60 * 60 * 1000))
      : 1;

    // Get period data
    const periodDays = period === "monthly" ? 30 : 365;
    const periodSessions = allSessions.filter((s) => {
      const date = new Date(s.start_time);
      const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
      return date >= cutoff;
    });

    const grossRevenue = periodSessions.reduce(
      (sum, s) => sum + (s.final_cost || 0),
      0,
    );

    // Scale to full period
    const scaleFactor = Math.min(1, periodDays / daysOperating);
    const scaledGrossRevenue = grossRevenue * scaleFactor;

    // Deductions
    const hostShare = scaledGrossRevenue * EBE_MODEL.opex.hostProfitShare;
    const nocFee = hostShare * EBE_MODEL.opex.nocLicenseFee;
    const bscsMaintenance =
      ((EBE_MODEL.opex.bscsMaintenancePerKw *
        EBE_MODEL.system.bscsOperatingCapacityKw) /
        12) *
      (period === "monthly" ? 1 : 12);
    const dcfcMaintenance =
      ((EBE_MODEL.opex.dcfcMaintenancePerCharger *
        EBE_MODEL.system.dcfcChargers) /
        12) *
      (period === "monthly" ? 1 : 12);
    const batteryMaintenance =
      (EBE_MODEL.opex.annualBatteryMaintenance / 12) *
      (period === "monthly" ? 1 : 12);

    const totalMaintenance =
      bscsMaintenance + dcfcMaintenance + batteryMaintenance;
    const netOperatingCashFlow =
      scaledGrossRevenue - hostShare - nocFee - totalMaintenance;

    // Cumulative
    const totalRevenue = allSessions.reduce(
      (sum, s) => sum + (s.final_cost || 0),
      0,
    );
    const totalHostShare = totalRevenue * EBE_MODEL.opex.hostProfitShare;
    const totalNocFee = totalHostShare * EBE_MODEL.opex.nocLicenseFee;
    const monthsOperating = daysOperating / 30;
    const totalMaintenanceCum =
      (EBE_MODEL.opex.totalAnnualMaintenance / 12) * monthsOperating;

    const cumulativeCashFlow =
      totalRevenue - totalHostShare - totalNocFee - totalMaintenanceCum;
    const netCapex = EBE_MODEL.incentives.netEffectiveCapex;
    const remainingToPayback = Math.max(0, netCapex - cumulativeCashFlow);

    const waterfallData = [
      {
        name: "Gross EV Revenue",
        value: scaledGrossRevenue,
        type: "positive",
        cumulative: scaledGrossRevenue,
        note: `${periodSessions.length} sessions × avg $${(scaledGrossRevenue / Math.max(1, periodSessions.length)).toFixed(2)}`,
      },
      {
        name: `Host Share (${(EBE_MODEL.opex.hostProfitShare * 100).toFixed(0)}%)`,
        value: -hostShare,
        type: "negative",
        cumulative: scaledGrossRevenue - hostShare,
        note: "Site partner revenue share",
      },
      {
        name: `NOC Fee (${(EBE_MODEL.opex.nocLicenseFee * 100).toFixed(0)}% of Host)`,
        value: -nocFee,
        type: "negative",
        cumulative: scaledGrossRevenue - hostShare - nocFee,
        note: "Network operations & monitoring",
      },
      {
        name: "Equipment Maintenance",
        value: -totalMaintenance,
        type: "negative",
        cumulative: scaledGrossRevenue - hostShare - nocFee - totalMaintenance,
        note: "BSCS + DCFC + Battery service",
      },
      {
        name: "Net Operating CF",
        value: netOperatingCashFlow,
        type: "total",
        cumulative: netOperatingCashFlow,
        note: `${((netOperatingCashFlow / scaledGrossRevenue) * 100).toFixed(1)}% margin`,
      },
    ];

    return {
      waterfallData,
      cumulativeCashFlow,
      remainingToPayback,
      netCapex,
      paybackProgress: ((netCapex - remainingToPayback) / netCapex) * 100,
      period,
    };
  }, [sessionData, period]);
};

// ========== AI INSIGHT HOOK ==========

/**
 * Hook for OPERATIONS INSIGHT
 */
export const useAIInsight = (liveData, sessionData, irrData) => {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);
  const [statusPill, setStatusPill] = useState("ON_TRACK");

  // Calculate status pill (client-side)
  useEffect(() => {
    if (!irrData || !sessionData?.weekly) {
      setStatusPill("ON_TRACK");
      return;
    }

    const { irrDelta } = irrData;
    const hasChargerFault = liveData?.chargers?.some(
      (c) => c.status === "FAULTED",
    );
    const sessionsVsProjected = sessionData.weekly.delta.sessions;

    if (irrDelta > 1 && sessionsVsProjected >= 0) {
      setStatusPill("AHEAD");
    } else if (irrDelta < -1 || hasChargerFault || sessionsVsProjected < -15) {
      setStatusPill("LAGGING");
    } else {
      setStatusPill("ON_TRACK");
    }
  }, [irrData, sessionData, liveData]);

  // Fetch AI analysis
  const fetchInsight = useCallback(async () => {
    if (!sessionData || !irrData) return;

    setLoading(true);

    const snapshot = {
      current_irr_trajectory: irrData.currentIRR?.toFixed(2) || "0",
      irr_vs_model_delta: irrData.irrDelta?.toFixed(2) || "0",
      actual_sessions_this_week: sessionData.weekly?.actual.sessions || 0,
      projected_sessions_this_week: sessionData.weekly?.projected.sessions || 0,
      actual_revenue_this_week:
        sessionData.weekly?.actual.revenue?.toFixed(2) || "0",
      projected_revenue_this_week:
        sessionData.weekly?.projected.revenue?.toFixed(2) || "0",
      blended_rate_achieved:
        sessionData.weekly?.actual.blendedRate?.toFixed(2) || "0",
      blended_rate_model: EBE_MODEL.evCharging.blendedEvRate,
      charger_utilization:
        sessionData.weekly?.actual.utilizationRate?.toFixed(1) || "0",
      any_charger_faults:
        liveData?.chargers?.some((c) => c.status === "FAULTED") || false,
      payback_progress:
        (
          ((EBE_MODEL.incentives.netEffectiveCapex -
            (irrData.paybackPeriod > 0
              ? EBE_MODEL.incentives.netEffectiveCapex / irrData.paybackPeriod
              : 0)) /
            EBE_MODEL.incentives.netEffectiveCapex) *
          100
        ).toFixed(1) || "0",
    };

    // Generate insight (mock for now - replace with Anthropic API)
    const mockInsight = generateMockInsight(snapshot, statusPill);

    setInsight(mockInsight);
    setLastAnalyzed(new Date());
    setLoading(false);
  }, [sessionData, irrData, liveData, statusPill]);

  // Auto-fetch
  useEffect(() => {
    if (sessionData && irrData) {
      fetchInsight();
      const interval = setInterval(fetchInsight, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [sessionData, irrData, fetchInsight]);

  return {
    insight,
    loading,
    lastAnalyzed,
    statusPill,
    refresh: fetchInsight,
  };
};

/**
 * Generate mock AI insight
 */
const generateMockInsight = (snapshot, status) => {
  const irrDelta = parseFloat(snapshot.irr_vs_model_delta);
  const sessionsActual = snapshot.actual_sessions_this_week;
  const sessionsProjected = snapshot.projected_sessions_this_week;
  const blendedActual = parseFloat(snapshot.blended_rate_achieved);
  const blendedModel = snapshot.blended_rate_model;
  const utilization = parseFloat(snapshot.charger_utilization);

  let trendSignal, draggingFactor, recommendedAction;

  if (status === "AHEAD") {
    trendSignal = `Asset performing ${Math.abs(irrDelta).toFixed(1)}% above model with ${sessionsActual} sessions this week at ${utilization.toFixed(0)}% utilization.`;
    draggingFactor =
      blendedActual < blendedModel
        ? `Blended rate ($${blendedActual.toFixed(2)}/kWh) is ${((1 - blendedActual / blendedModel) * 100).toFixed(0)}% below target — extension pricing optimization available.`
        : "No significant factors limiting performance. System operating at peak efficiency.";
    recommendedAction = `Consider raising extension price from $3.00 to $4.50 — current demand supports it and would add ~$18K annually to revenue.`;
  } else if (status === "LAGGING") {
    const sessionDelta = (
      ((sessionsActual - sessionsProjected) / sessionsProjected) *
      100
    ).toFixed(0);
    trendSignal = `Utilization at ${utilization.toFixed(0)}% with ${sessionsActual} sessions — ${Math.abs(sessionDelta)}% below weekly target.`;
    draggingFactor = snapshot.any_charger_faults
      ? "Charger fault detected — each hour of downtime costs approximately $15 in lost revenue."
      : `Session volume is ${Math.abs(sessionDelta)}% below model — investigate site visibility and EV traffic patterns.`;
    recommendedAction = snapshot.any_charger_faults
      ? "Priority: Resolve charger fault within 24 hours — availability is the #1 IRR driver at current utilization levels."
      : "Review site signage visibility and consider promotional pricing during off-peak hours to drive trial.";
  } else {
    trendSignal = `On track: ${sessionsActual} sessions this week at $${blendedActual.toFixed(2)}/kWh blended rate — within ${Math.abs(irrDelta).toFixed(1)}% of model.`;
    draggingFactor =
      utilization < 50
        ? `Utilization at ${utilization.toFixed(0)}% indicates growth headroom — additional marketing could improve IRR.`
        : "All KPIs within expected ranges. Maintaining steady operational performance.";
    recommendedAction = `Current trajectory leads to ${(EBE_MODEL.targets.baselineIRR + irrDelta).toFixed(1)}% IRR — focus on maintaining consistency and monitoring for optimization opportunities.`;
  }

  return {
    trend_signal: trendSignal,
    dragging_factor: draggingFactor,
    recommended_action: recommendedAction,
  };
};

export default useLiveSessionData;
