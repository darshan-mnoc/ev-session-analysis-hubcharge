/**
 * Financial Insights Page (eBe Investor Dashboard)
 * Matches Sessions page design language
 */

import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  useLiveSessionData,
  useSessionSummary,
  useIRRProjection,
  useRevenueWaterfall,
} from "./hooks/useFinancialData";
import { LoginForm, AccessDenied, AuthLoading } from "./components/auth";
import { ModelCalculator } from "./components/financial";
import { EBE_MODEL, CHARGERS, PRICING } from "./constants/ebeModel";
import "./FinancialInsights.css";

// ============================================================
// ICONS
// ============================================================

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const LoadingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ============================================================
// PAGE LOADING INDICATOR
// ============================================================

const PageLoadingBar = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="page-loading-bar">
      <div className="page-loading-content">
        <LoadingIcon />
        <span className="page-loading-text">Loading financial data...</span>
      </div>
      <div className="page-loading-track">
        <div className="page-loading-progress" />
      </div>
    </div>
  );
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const formatCurrency = (value, showCents = false) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(showCents ? 1 : 0)}K`;
  return `$${value.toFixed(showCents ? 2 : 0)}`;
};

const formatPercent = (value, decimals = 0) => `${(value * 100).toFixed(decimals)}%`;

// Date helpers
const formatDateShort = (date) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateFull = (date) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMonthYear = (date) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const formatYear = (date) => {
  return new Date(date).getFullYear().toString();
};

const getDateRangeForView = (view, baseDate = new Date()) => {
  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);

  switch (view) {
    case "daily":
      // Last 7 days
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      // Last 4 weeks
      start.setDate(end.getDate() - 27);
      start.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      // Current year (Jan 1 to now)
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "yearly":
      // All years from start
      start.setFullYear(start.getFullYear() - 19);
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
};

// Get list of months for dropdown
const getMonthOptions = () => {
  return [
    { value: 0, label: "January" },
    { value: 1, label: "February" },
    { value: 2, label: "March" },
    { value: 3, label: "April" },
    { value: 4, label: "May" },
    { value: 5, label: "June" },
    { value: 6, label: "July" },
    { value: 7, label: "August" },
    { value: 8, label: "September" },
    { value: 9, label: "October" },
    { value: 10, label: "November" },
    { value: 11, label: "December" },
  ];
};

// Get list of years for dropdown (from 2024 to current)
const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = 2024; y <= currentYear; y++) {
    years.push({ value: y, label: y.toString() });
  }
  return years;
};

// ============================================================
// PAYBACK PROGRESS SECTION
// ============================================================

const PaybackProgress = ({ data, irrData }) => {
  if (!data) return null;

  const { cumulativeCashFlow, netCapex, paybackProgress } = data;
  const remaining = Math.max(0, netCapex - cumulativeCashFlow);
  const paybackYears = irrData?.paybackPeriod || EBE_MODEL.targets.paybackYears;

  return (
    <section className="fi-section">
      <div className="section-header">
        <h2>Investment Payback Progress</h2>
      </div>

      <div className="payback-container">
        <div className="payback-progress-wrapper">
          <div className="payback-bar-bg">
            <div
              className="payback-bar-fill"
              style={{ width: `${Math.min(100, Math.max(2, paybackProgress))}%` }}
            />
          </div>
          <div className="payback-labels">
            <span>$0</span>
            <span className="payback-current">{formatCurrency(cumulativeCashFlow)} recovered</span>
            <span>{formatCurrency(netCapex)}</span>
          </div>
        </div>

        <div className="payback-percent">
          <span className="percent-value">{paybackProgress.toFixed(1)}%</span>
          <span className="percent-label">Complete</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card accent">
          <span className="stat-label">Cash Flow to Date</span>
          <span className="stat-value">{formatCurrency(cumulativeCashFlow)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Remaining to Payback</span>
          <span className="stat-value">{formatCurrency(remaining)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Net Investment</span>
          <span className="stat-value">{formatCurrency(netCapex)}</span>
          <span className="stat-sub">After ITC & incentives</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Est. Payback Period</span>
          <span className="stat-value">{paybackYears > 20 ? ">20" : paybackYears.toFixed(1)} yrs</span>
          <span className="stat-sub">Target: {EBE_MODEL.targets.paybackYears} yrs</span>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// EBE PROJECTION SECTION (Year 1, Year 2, Year 3-5, Year 6-20)
// ============================================================

const EBeProjection = () => {
  const projectionData = [
    {
      label: "Year 1",
      energyPerSession: EBE_MODEL.evCharging.energyPerSession,
      dailyDischarge: EBE_MODEL.utilization.dailyDischargeYear1to5,
      evsPerDay: EBE_MODEL.utilization.sessionsPerDayYear1to5,
      cyclesPerDay: 2,
    },
    {
      label: "Year 2",
      energyPerSession: EBE_MODEL.evCharging.energyPerSession,
      dailyDischarge: EBE_MODEL.utilization.dailyDischargeYear1to5,
      evsPerDay: EBE_MODEL.utilization.sessionsPerDayYear1to5,
      cyclesPerDay: 2,
    },
    {
      label: "Year 3-5",
      energyPerSession: EBE_MODEL.evCharging.energyPerSession,
      dailyDischarge: EBE_MODEL.utilization.dailyDischargeYear1to5,
      evsPerDay: EBE_MODEL.utilization.sessionsPerDayYear1to5,
      cyclesPerDay: 2,
    },
    {
      label: "Year 6-20",
      energyPerSession: EBE_MODEL.evCharging.energyPerSession,
      dailyDischarge: EBE_MODEL.utilization.dailyDischargeYear6to20,
      evsPerDay: EBE_MODEL.utilization.sessionsPerDayYear6to20,
      cyclesPerDay: 2,
    },
  ];

  return (
    <section className="fi-section">
      <div className="section-header">
        <h2>eBe Utilization Projection</h2>
        <span className="model-badge">Model {EBE_MODEL.version}</span>
      </div>

      {/* Energy per Session Header */}
      <div className="projection-header">
        <span className="proj-header-label">Energy per EV Session</span>
        <span className="proj-header-value">{EBE_MODEL.evCharging.energyPerSession} kWh</span>
      </div>

      {/* Projection Table */}
      <div className="projection-table">
        <div className="projection-row header">
          <span className="proj-col period">Period</span>
          <span className="proj-col discharge">Daily Discharge to EV Load</span>
          <span className="proj-col evs">EVs per Day</span>
          <span className="proj-col cycles">Cycles per Day</span>
        </div>
        {projectionData.map((row, idx) => (
          <div key={idx} className={`projection-row ${idx === 3 ? "highlight" : ""}`}>
            <span className="proj-col period">{row.label}</span>
            <span className="proj-col discharge">{row.dailyDischarge} kWh</span>
            <span className="proj-col evs accent">{row.evsPerDay} EV per day</span>
            <span className="proj-col cycles">{row.cyclesPerDay} Cycles per Day</span>
          </div>
        ))}
      </div>

      {/* Max Utilization Note */}
      <div className="projection-note">
        <span className="note-label">Exceeds Max Utilization</span>
        <span className="note-value">{EBE_MODEL.utilization.dailyContinuousMaxDischarge} kWh/day ({EBE_MODEL.utilization.maxSessionsPerDay} sessions max)</span>
      </div>
    </section>
  );
};

// ============================================================
// PERFORMANCE CHART SECTION (Daily/Weekly/Monthly/Yearly)
// ============================================================

const PerformanceChart = ({ sessionData, irrData, isLoading }) => {
  const [view, setView] = useState("daily"); // Default to daily
  const now = new Date();

  // ===== DAILY FILTER STATES =====
  const [dailyStartDate, setDailyStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [dailyEndDate, setDailyEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // ===== WEEKLY FILTER STATES =====
  const [weeklyMonth, setWeeklyMonth] = useState(now.getMonth());
  const [weeklyYear, setWeeklyYear] = useState(now.getFullYear());

  // ===== MONTHLY FILTER STATES =====
  const [monthlyStartMonth, setMonthlyStartMonth] = useState(0); // January
  const [monthlyStartYear, setMonthlyStartYear] = useState(now.getFullYear());
  const [monthlyEndMonth, setMonthlyEndMonth] = useState(now.getMonth());
  const [monthlyEndYear, setMonthlyEndYear] = useState(now.getFullYear());

  // ===== YEARLY FILTER STATES =====
  const [yearlyStartYear, setYearlyStartYear] = useState(1);
  const [yearlyEndYear, setYearlyEndYear] = useState(20);

  // Handle view change - reset filters to defaults
  const handleViewChange = useCallback((newView) => {
    setView(newView);
    const today = new Date();

    if (newView === "daily") {
      const start = new Date();
      start.setDate(today.getDate() - 6);
      setDailyStartDate(start.toISOString().split('T')[0]);
      setDailyEndDate(today.toISOString().split('T')[0]);
    } else if (newView === "weekly") {
      setWeeklyMonth(today.getMonth());
      setWeeklyYear(today.getFullYear());
    } else if (newView === "monthly") {
      setMonthlyStartMonth(0);
      setMonthlyStartYear(today.getFullYear());
      setMonthlyEndMonth(today.getMonth());
      setMonthlyEndYear(today.getFullYear());
    } else if (newView === "yearly") {
      setYearlyStartYear(1);
      setYearlyEndYear(20);
    }
  }, []);

  // Format date range label based on view
  const getDateRangeLabel = useCallback(() => {
    const monthNames = getMonthOptions();
    if (view === "daily") {
      return `${formatDateFull(dailyStartDate)} — ${formatDateFull(dailyEndDate)}`;
    } else if (view === "weekly") {
      return `${monthNames[weeklyMonth].label} ${weeklyYear}`;
    } else if (view === "monthly") {
      return `${monthNames[monthlyStartMonth].label} ${monthlyStartYear} — ${monthNames[monthlyEndMonth].label} ${monthlyEndYear}`;
    } else if (view === "yearly") {
      return `Year ${yearlyStartYear} — Year ${yearlyEndYear}`;
    }
    return "All Data";
  }, [view, dailyStartDate, dailyEndDate, weeklyMonth, weeklyYear, monthlyStartMonth, monthlyStartYear, monthlyEndMonth, monthlyEndYear, yearlyStartYear, yearlyEndYear]);

  // Calculate IRR based on current view period
  const periodIRR = useMemo(() => {
    const allSessions = sessionData?.allSessions || [];
    if (allSessions.length === 0) return 0;

    // Helper for date key
    const getDateKey = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Filter sessions based on current view
    let periodSessions = [];
    let daysInPeriod = 7;

    if (view === "daily") {
      periodSessions = allSessions.filter(s => {
        const sessionKey = getDateKey(s.start_time);
        return sessionKey >= dailyStartDate && sessionKey <= dailyEndDate;
      });
      // Calculate actual days in range
      const start = new Date(dailyStartDate);
      const end = new Date(dailyEndDate);
      daysInPeriod = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    } else if (view === "weekly") {
      // Filter by selected month/year
      periodSessions = allSessions.filter(s => {
        const d = new Date(s.start_time);
        return d.getMonth() === weeklyMonth && d.getFullYear() === weeklyYear;
      });
      daysInPeriod = new Date(weeklyYear, weeklyMonth + 1, 0).getDate();
    } else if (view === "monthly") {
      // Filter by start/end month range
      periodSessions = allSessions.filter(s => {
        const d = new Date(s.start_time);
        const sessionYM = d.getFullYear() * 12 + d.getMonth();
        const startYM = monthlyStartYear * 12 + monthlyStartMonth;
        const endYM = monthlyEndYear * 12 + monthlyEndMonth;
        return sessionYM >= startYM && sessionYM <= endYM;
      });
      // Calculate days in range
      const startDate = new Date(monthlyStartYear, monthlyStartMonth, 1);
      const endDate = new Date(monthlyEndYear, monthlyEndMonth + 1, 0);
      daysInPeriod = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    } else if (view === "yearly") {
      // For yearly, use all available sessions
      periodSessions = allSessions;
      daysInPeriod = 365 * (yearlyEndYear - yearlyStartYear + 1);
    }

    if (periodSessions.length === 0) return 0;

    const totalRevenue = periodSessions.reduce((sum, s) => sum + (s.final_cost || 0), 0);

    // Annualized revenue based on period performance
    const annualizedRevenue = (totalRevenue / Math.max(1, daysInPeriod)) * 365;
    const projectedAnnualRevenue = EBE_MODEL.utilization.sessionsPerDayYear1to5 * 365 *
                                    EBE_MODEL.evCharging.energyPerSession *
                                    EBE_MODEL.evCharging.blendedEvRate;

    // Scale IRR based on performance ratio
    const performanceRatio = annualizedRevenue / projectedAnnualRevenue;
    const baselineIRR = EBE_MODEL.targets.baselineIRR;

    return Math.max(0, baselineIRR * performanceRatio);
  }, [sessionData?.allSessions, view, dailyStartDate, dailyEndDate, weeklyMonth, weeklyYear, monthlyStartMonth, monthlyStartYear, monthlyEndMonth, monthlyEndYear, yearlyStartYear, yearlyEndYear]);

  // Generate chart data based on view and filtered sessions
  const { chartData, metrics } = useMemo(() => {
    const modelBaselineIRR = EBE_MODEL.targets.baselineIRR;
    const sessionsPerDayProjected = EBE_MODEL.utilization.sessionsPerDayYear1to5;
    const allSessions = sessionData?.allSessions || [];

    let data = [];
    let actualTotal = 0;
    let projectedTotal = 0;
    let actualRevTotal = 0;

    // Helper to get date string for comparison (YYYY-MM-DD)
    const getDateKey = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Helper to parse date string to Date
    const parseDate = (dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    if (view === "daily") {
      // ===== DAILY VIEW: Show each day from start to end date =====
      const startDateObj = parseDate(dailyStartDate);
      const endDateObj = parseDate(dailyEndDate);

      // Create a map of date key (YYYY-MM-DD) -> sessions
      const sessionsByDay = new Map();
      allSessions.forEach(session => {
        const sessionDateKey = getDateKey(session.start_time);
        const sessionDateObj = parseDate(sessionDateKey);

        if (sessionDateObj >= startDateObj && sessionDateObj <= endDateObj) {
          if (!sessionsByDay.has(sessionDateKey)) {
            sessionsByDay.set(sessionDateKey, { sessions: 0, revenue: 0 });
          }
          const bucket = sessionsByDay.get(sessionDateKey);
          bucket.sessions += 1;
          bucket.revenue += session.final_cost || 0;
        }
      });

      // Generate chart data for each day
      const current = new Date(startDateObj);
      while (current <= endDateObj) {
        const dateKey = getDateKey(current);
        const displayLabel = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const bucket = sessionsByDay.get(dateKey) || { sessions: 0, revenue: 0 };

        actualTotal += bucket.sessions;
        actualRevTotal += bucket.revenue;
        projectedTotal += sessionsPerDayProjected;

        data.push({
          name: displayLabel,
          actual: bucket.sessions,
          projected: sessionsPerDayProjected,
          actualRevenue: bucket.revenue,
          currentIRR: periodIRR,
          baselineIRR: modelBaselineIRR,
        });

        current.setDate(current.getDate() + 1);
      }

    } else if (view === "weekly") {
      // ===== WEEKLY VIEW: Show weeks of the selected month/year =====
      const daysInMonth = new Date(weeklyYear, weeklyMonth + 1, 0).getDate();
      const weeksInMonth = Math.ceil(daysInMonth / 7);

      // Group sessions by week of month
      const sessionsByWeek = Array(weeksInMonth).fill(null).map(() => ({ sessions: 0, revenue: 0 }));

      allSessions.forEach(session => {
        const sessionDate = new Date(session.start_time);
        if (sessionDate.getMonth() === weeklyMonth && sessionDate.getFullYear() === weeklyYear) {
          const dayOfMonth = sessionDate.getDate();
          const weekIndex = Math.min(weeksInMonth - 1, Math.floor((dayOfMonth - 1) / 7));
          sessionsByWeek[weekIndex].sessions += 1;
          sessionsByWeek[weekIndex].revenue += session.final_cost || 0;
        }
      });

      const weekProjected = sessionsPerDayProjected * 7;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let week = 0; week < weeksInMonth; week++) {
        const weekStartDay = week * 7 + 1;
        const weekEndDay = Math.min((week + 1) * 7, daysInMonth);
        const weekLabel = `${monthNames[weeklyMonth]} ${weekStartDay}-${weekEndDay}`;

        actualTotal += sessionsByWeek[week].sessions;
        actualRevTotal += sessionsByWeek[week].revenue;
        projectedTotal += weekProjected;

        data.push({
          name: `Wk ${week + 1}`,
          actual: sessionsByWeek[week].sessions,
          projected: weekProjected,
          actualRevenue: sessionsByWeek[week].revenue,
          currentIRR: periodIRR,
          baselineIRR: modelBaselineIRR,
        });
      }

    } else if (view === "monthly") {
      // ===== MONTHLY VIEW: Show months from start to end month/year =====
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Calculate start and end as year-month values for comparison
      const startYM = monthlyStartYear * 12 + monthlyStartMonth;
      const endYM = monthlyEndYear * 12 + monthlyEndMonth;

      // Group sessions by year-month
      const sessionsByYM = new Map();
      allSessions.forEach(session => {
        const sessionDate = new Date(session.start_time);
        const sessionYM = sessionDate.getFullYear() * 12 + sessionDate.getMonth();
        if (sessionYM >= startYM && sessionYM <= endYM) {
          const key = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}`;
          if (!sessionsByYM.has(key)) {
            sessionsByYM.set(key, { sessions: 0, revenue: 0 });
          }
          const bucket = sessionsByYM.get(key);
          bucket.sessions += 1;
          bucket.revenue += session.final_cost || 0;
        }
      });

      // Generate chart data for each month in range
      for (let ym = startYM; ym <= endYM; ym++) {
        const year = Math.floor(ym / 12);
        const month = ym % 12;
        const key = `${year}-${month}`;
        const bucket = sessionsByYM.get(key) || { sessions: 0, revenue: 0 };

        const isFutureMonth = year > currentYear || (year === currentYear && month > currentMonth);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthProjected = sessionsPerDayProjected * daysInMonth;

        const actualSessions = isFutureMonth ? 0 : bucket.sessions;
        const actualRevenue = isFutureMonth ? 0 : bucket.revenue;

        // Format label: "Jan 24" or just "Jan" if same year
        const label = monthlyStartYear === monthlyEndYear
          ? monthNames[month]
          : `${monthNames[month]} '${String(year).slice(-2)}`;

        actualTotal += actualSessions;
        actualRevTotal += actualRevenue;
        projectedTotal += monthProjected;

        data.push({
          name: label,
          actual: actualSessions,
          projected: monthProjected,
          actualRevenue: actualRevenue,
          currentIRR: periodIRR,
          baselineIRR: modelBaselineIRR,
        });
      }

    } else if (view === "yearly") {
      // ===== YEARLY VIEW: Show years from start to end year =====
      const trajectoryData = irrData?.trajectoryData || [];
      const baselineData = irrData?.baselineData || [];

      // Get system go-live year to calculate actual year data
      const goLiveYear = sessionData?.systemGoLiveDate?.getFullYear() || now.getFullYear();

      // Group sessions by projection year (1-20)
      const sessionsByProjYear = new Map();
      allSessions.forEach(session => {
        const sessionYear = new Date(session.start_time).getFullYear();
        const projYear = sessionYear - goLiveYear + 1; // Convert to projection year (1-based)
        if (projYear >= yearlyStartYear && projYear <= yearlyEndYear) {
          if (!sessionsByProjYear.has(projYear)) {
            sessionsByProjYear.set(projYear, { sessions: 0, revenue: 0 });
          }
          const bucket = sessionsByProjYear.get(projYear);
          bucket.sessions += 1;
          bucket.revenue += session.final_cost || 0;
        }
      });

      for (let yr = yearlyStartYear; yr <= yearlyEndYear; yr++) {
        const sessionsPerDay = yr <= 5
          ? EBE_MODEL.utilization.sessionsPerDayYear1to5
          : EBE_MODEL.utilization.sessionsPerDayYear6to20;
        const yearProjected = sessionsPerDay * 365;

        const bucket = sessionsByProjYear.get(yr) || { sessions: 0, revenue: 0 };
        const traj = trajectoryData.find(t => t.year === yr);
        const base = baselineData.find(t => t.year === yr);

        // Format label: "1st '26", "2nd '27", etc.
        const ordinal = yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : `${yr}th`;
        const actualYear = goLiveYear + yr - 1;
        const yearLabel = `${ordinal} '${String(actualYear).slice(-2)}`;

        actualTotal += bucket.sessions;
        actualRevTotal += bucket.revenue;
        projectedTotal += yearProjected;

        data.push({
          name: yearLabel,
          actual: bucket.sessions,
          projected: yearProjected,
          actualRevenue: bucket.revenue,
          currentIRR: traj?.irr || periodIRR,
          baselineIRR: base?.irr || modelBaselineIRR,
        });
      }
    }

    const delta = projectedTotal > 0 ? ((actualTotal - projectedTotal) / projectedTotal) * 100 : 0;

    return {
      chartData: data,
      metrics: {
        actualSessions: actualTotal,
        projectedSessions: projectedTotal,
        sessionsDelta: delta,
        actualRevenue: actualRevTotal,
        projectedRevenue: projectedTotal * EBE_MODEL.evCharging.energyPerSession * EBE_MODEL.evCharging.blendedEvRate,
        revenueDelta: 0,
        currentIRR: periodIRR,
      }
    };
  }, [sessionData?.allSessions, sessionData?.systemGoLiveDate, periodIRR, irrData, view, dailyStartDate, dailyEndDate, weeklyMonth, weeklyYear, monthlyStartMonth, monthlyStartYear, monthlyEndMonth, monthlyEndYear, yearlyStartYear, yearlyEndYear, now]);

  // Display values use period-specific calculations
  const displayCurrentIRR = periodIRR;
  const displayModelIRR = EBE_MODEL.targets.baselineIRR;
  const displayTargetIRR = EBE_MODEL.targets.targetIRRMin;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <div className="tooltip-header">{label}</div>
          {payload.map((entry, idx) => (
            <div key={idx} className="tooltip-row">
              <span className="tooltip-dot" style={{ background: entry.color }} />
              <span className="tooltip-label">{entry.name}</span>
              <span className="tooltip-value">
                {entry.dataKey.includes('IRR')
                  ? `${entry.value?.toFixed(1)}%`
                  : entry.value?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <section className="fi-section">
      <div className="section-header">
        <h2>Session Performance vs. Model</h2>
        <div className="view-controls">
          <div className="view-tabs">
            {["daily", "weekly", "monthly", "yearly"].map((v) => (
              <button
                key={v}
                className={`view-tab ${view === v ? "active" : ""}`}
                onClick={() => handleViewChange(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Filters Row */}
      <div className="date-filter-row">
        {/* ===== DAILY FILTERS: Calendar start/end date ===== */}
        {view === "daily" && (
          <>
            <div className="date-input-group">
              <label>Start Date</label>
              <input
                type="date"
                value={dailyStartDate}
                onChange={(e) => setDailyStartDate(e.target.value)}
                max={dailyEndDate}
              />
            </div>
            <span className="date-separator">—</span>
            <div className="date-input-group">
              <label>End Date</label>
              <input
                type="date"
                value={dailyEndDate}
                onChange={(e) => setDailyEndDate(e.target.value)}
                min={dailyStartDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </>
        )}

        {/* ===== WEEKLY FILTERS: Month and Year dropdowns ===== */}
        {view === "weekly" && (
          <>
            <div className="date-input-group">
              <label>Month</label>
              <select
                value={weeklyMonth}
                onChange={(e) => setWeeklyMonth(parseInt(e.target.value))}
              >
                {getMonthOptions().map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="date-input-group">
              <label>Year</label>
              <select
                value={weeklyYear}
                onChange={(e) => setWeeklyYear(parseInt(e.target.value))}
              >
                {getYearOptions().map((y) => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* ===== MONTHLY FILTERS: Start/End Month+Year ===== */}
        {view === "monthly" && (
          <>
            <div className="date-input-group">
              <label>Start Month</label>
              <select
                value={monthlyStartMonth}
                onChange={(e) => setMonthlyStartMonth(parseInt(e.target.value))}
              >
                {getMonthOptions().map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="date-input-group">
              <label>Start Year</label>
              <select
                value={monthlyStartYear}
                onChange={(e) => setMonthlyStartYear(parseInt(e.target.value))}
              >
                {getYearOptions().map((y) => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>
            <span className="date-separator">—</span>
            <div className="date-input-group">
              <label>End Month</label>
              <select
                value={monthlyEndMonth}
                onChange={(e) => setMonthlyEndMonth(parseInt(e.target.value))}
              >
                {getMonthOptions().map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="date-input-group">
              <label>End Year</label>
              <select
                value={monthlyEndYear}
                onChange={(e) => setMonthlyEndYear(parseInt(e.target.value))}
              >
                {getYearOptions().map((y) => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* ===== YEARLY FILTERS: Start/End Year (1-20) ===== */}
        {view === "yearly" && (
          <>
            <div className="date-input-group">
              <label>Start Year</label>
              <select
                value={yearlyStartYear}
                onChange={(e) => setYearlyStartYear(parseInt(e.target.value))}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((yr) => {
                  const ordinal = yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : `${yr}th`;
                  const goLiveYear = sessionData?.systemGoLiveDate?.getFullYear() || now.getFullYear();
                  const actualYear = goLiveYear + yr - 1;
                  return (
                    <option key={yr} value={yr}>{ordinal} Year ({actualYear})</option>
                  );
                })}
              </select>
            </div>
            <span className="date-separator">—</span>
            <div className="date-input-group">
              <label>End Year</label>
              <select
                value={yearlyEndYear}
                onChange={(e) => setYearlyEndYear(parseInt(e.target.value))}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).filter(yr => yr >= yearlyStartYear).map((yr) => {
                  const ordinal = yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : `${yr}th`;
                  const goLiveYear = sessionData?.systemGoLiveDate?.getFullYear() || now.getFullYear();
                  const actualYear = goLiveYear + yr - 1;
                  return (
                    <option key={yr} value={yr}>{ordinal} Year ({actualYear})</option>
                  );
                })}
              </select>
            </div>
          </>
        )}

        <span className="date-range-display">
          <CalendarIcon /> {getDateRangeLabel()}
        </span>
      </div>

      {/* Performance Summary */}
      <div className={`performance-summary ${metrics?.sessionsDelta >= 0 ? "positive" : "negative"}`}>
        <div className="summary-main">
          <span className={`summary-badge ${metrics?.sessionsDelta >= 0 ? "positive" : "negative"}`}>
            {metrics?.sessionsDelta >= 0 ? "AHEAD" : "BEHIND"}
          </span>
          <span className="summary-text">
            {Math.abs(metrics?.sessionsDelta || 0).toFixed(1)}% {metrics?.sessionsDelta >= 0 ? "above" : "below"} projection
          </span>
        </div>
        <div className="summary-stats">
          <span>{metrics?.actualSessions?.toLocaleString() || 0} actual</span>
          <span className="divider">vs</span>
          <span>{metrics?.projectedSessions?.toLocaleString() || 0} projected</span>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="sessions"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              width={50}
            />
            <YAxis
              yAxisId="irr"
              orientation="right"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[-10, 30]}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="rect"
              iconSize={10}
              wrapperStyle={{ fontSize: '11px' }}
            />

            {/* Bars */}
            <Bar
              yAxisId="sessions"
              dataKey="projected"
              name="Projected Sessions"
              fill="var(--bg-hover)"
              radius={[4, 4, 0, 0]}
              barSize={view === "yearly" ? 20 : 16}
            />
            <Bar
              yAxisId="sessions"
              dataKey="actual"
              name="Actual Sessions"
              fill="var(--accent)"
              radius={[4, 4, 0, 0]}
              barSize={view === "yearly" ? 20 : 16}
            />

            {/* IRR Lines */}
            <Line
              yAxisId="irr"
              type="monotone"
              dataKey="currentIRR"
              name="Current IRR"
              stroke="var(--green)"
              strokeWidth={2}
              dot={{ fill: 'var(--green)', r: 3 }}
            />
            <Line
              yAxisId="irr"
              type="monotone"
              dataKey="baselineIRR"
              name="Model IRR"
              stroke="var(--text-muted)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-box">
          <span className="metric-label">Actual Sessions</span>
          <span className="metric-value accent">{metrics?.actualSessions?.toLocaleString() || 0}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Projected Sessions</span>
          <span className="metric-value">{metrics?.projectedSessions?.toLocaleString() || 0}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Actual Revenue</span>
          <span className="metric-value accent">{formatCurrency(metrics?.actualRevenue || 0)}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Current IRR</span>
          <span className="metric-value green">{displayCurrentIRR.toFixed(1)}%</span>
          <span className="metric-sub">Target: {displayTargetIRR}%</span>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// MODEL ASSUMPTIONS SECTION (Full Detail)
// ============================================================

const ModelAssumptions = () => {
  return (
    <section className="fi-section model-section">
      <div className="section-header">
        <h2>eBe Model Assumptions</h2>
        <span className="model-badge">v{EBE_MODEL.version} • {EBE_MODEL.effectiveDate}</span>
      </div>

      {/* Key Highlights */}
      <div className="model-highlights">
        <div className="highlight-card">
          <span className="hl-value">{EBE_MODEL.targets.baselineIRR}%</span>
          <span className="hl-label">20-Year IRR Target</span>
        </div>
        <div className="highlight-card">
          <span className="hl-value">{EBE_MODEL.targets.paybackYears} yrs</span>
          <span className="hl-label">Payback Period</span>
        </div>
        <div className="highlight-card">
          <span className="hl-value">{formatCurrency(EBE_MODEL.capex.totalSystemCapex)}</span>
          <span className="hl-label">Gross Capex</span>
        </div>
        <div className="highlight-card accent">
          <span className="hl-value">{formatCurrency(EBE_MODEL.incentives.netEffectiveCapex)}</span>
          <span className="hl-label">Net After Incentives</span>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="model-grid">
        {/* System & Capex */}
        <div className="model-card">
          <h4>System & Capex</h4>
          <p className="card-note">{EBE_MODEL.capex.note}</p>
          <div className="model-items">
            <div className="model-item">
              <span>CVP EV Systems</span>
              <span>{EBE_MODEL.system.cvpEvSystems}</span>
            </div>
            <div className="model-item">
              <span>DCFC Chargers</span>
              <span>{EBE_MODEL.system.dcfcChargers} units</span>
            </div>
            <div className="model-item">
              <span>Battery Storage</span>
              <span>{EBE_MODEL.system.bscsStorageCapacityKwh} kWh</span>
            </div>
            <div className="model-item">
              <span>Power Capacity</span>
              <span>{EBE_MODEL.system.bscsOperatingCapacityKw} kW</span>
            </div>
            <div className="model-item highlight">
              <span>System Capex</span>
              <span>{formatCurrency(EBE_MODEL.capex.totalSystemCapex)}</span>
            </div>
            <div className="model-item">
              <span>Battery Replacement</span>
              <span>{formatCurrency(EBE_MODEL.capex.batteryReplacementCost)} / {EBE_MODEL.capex.batteryReplacementInterval} yrs</span>
            </div>
            <div className="model-item">
              <span>Round-Trip Efficiency</span>
              <span>{formatPercent(EBE_MODEL.system.systemRte)}</span>
            </div>
          </div>
        </div>

        {/* Federal & State Incentives */}
        <div className="model-card">
          <h4>Federal & State Incentives</h4>
          <p className="card-note">{EBE_MODEL.incentives.note}</p>
          <div className="model-items">
            <div className="model-item">
              <span>Federal ITC</span>
              <span>{formatPercent(EBE_MODEL.incentives.federalITC)}</span>
            </div>
            <div className="model-item">
              <span>ITC Direct Pay</span>
              <span>{formatCurrency(EBE_MODEL.incentives.federalITCAmount)}</span>
            </div>
            <div className="model-item">
              <span>Bonus MACRS</span>
              <span>{formatPercent(EBE_MODEL.incentives.bonusMACRS)}</span>
            </div>
            <div className="model-item">
              <span>MACRS Year 1 Cash</span>
              <span>{formatCurrency(EBE_MODEL.incentives.macrsYear1CashValue)}</span>
            </div>
            <div className="model-item">
              <span>Federal Tax Rate</span>
              <span>{formatPercent(EBE_MODEL.incentives.federalTaxRate)}</span>
            </div>
            <div className="model-item">
              <span>State Tax Rate (CA)</span>
              <span>{formatPercent(EBE_MODEL.incentives.stateTaxRate, 2)}</span>
            </div>
            <div className="model-item highlight">
              <span>Net Effective Capex</span>
              <span>{formatCurrency(EBE_MODEL.incentives.netEffectiveCapex)}</span>
            </div>
          </div>
        </div>

        {/* EV Charging Revenue */}
        <div className="model-card">
          <h4>EV Charging Revenue</h4>
          <p className="card-note">{EBE_MODEL.evCharging.note}</p>
          <div className="model-items">
            <div className="model-item highlight">
              <span>Blended EV Rate</span>
              <span>${EBE_MODEL.evCharging.blendedEvRate.toFixed(2)}/kWh</span>
            </div>
            <div className="model-item">
              <span>Energy per Session</span>
              <span>{EBE_MODEL.evCharging.energyPerSession} kWh</span>
            </div>
            <div className="model-item">
              <span>Base Session</span>
              <span>${PRICING.baseSession.price} / {PRICING.baseSession.duration} min</span>
            </div>
            <div className="model-item">
              <span>Extension Price</span>
              <span>${PRICING.extensions.currentPrice} / 5 min</span>
            </div>
            <div className="model-item">
              <span>Optimized Extension</span>
              <span>${PRICING.extensions.optimizedPrice} / 5 min</span>
            </div>
            <div className="model-item">
              <span>Rate Inflation</span>
              <span>{formatPercent(EBE_MODEL.evCharging.rateInflationYears1to5)}/yr</span>
            </div>
          </div>
        </div>

        {/* Utilization Projections */}
        <div className="model-card">
          <h4>Utilization Projections</h4>
          <p className="card-note">{EBE_MODEL.utilization.note}</p>
          <div className="model-items">
            <div className="model-item">
              <span>Daily Discharge (Yr 1-5)</span>
              <span>{EBE_MODEL.utilization.dailyDischargeYear1to5} kWh</span>
            </div>
            <div className="model-item">
              <span>Sessions/Day (Yr 1-5)</span>
              <span>{EBE_MODEL.utilization.sessionsPerDayYear1to5}</span>
            </div>
            <div className="model-item highlight">
              <span>Daily Discharge (Yr 6+)</span>
              <span>{EBE_MODEL.utilization.dailyDischargeYear6to20} kWh</span>
            </div>
            <div className="model-item highlight">
              <span>Sessions/Day (Yr 6+)</span>
              <span>{EBE_MODEL.utilization.sessionsPerDayYear6to20}</span>
            </div>
            <div className="model-item">
              <span>Max Daily Capacity</span>
              <span>{EBE_MODEL.utilization.dailyContinuousMaxDischarge} kWh</span>
            </div>
            <div className="model-item">
              <span>Max Sessions/Day</span>
              <span>{EBE_MODEL.utilization.maxSessionsPerDay}</span>
            </div>
          </div>
        </div>

        {/* Grid Electricity */}
        <div className="model-card">
          <h4>Grid Electricity (Recharge)</h4>
          <p className="card-note">{EBE_MODEL.rechargeCosts.note}</p>
          <div className="model-items">
            <div className="model-item">
              <span>Tariff</span>
              <span>{EBE_MODEL.rechargeCosts.tariff}</span>
            </div>
            <div className="model-item">
              <span>Peak Rate</span>
              <span>${EBE_MODEL.rechargeCosts.peakBlended.toFixed(3)}/kWh</span>
            </div>
            <div className="model-item highlight">
              <span>Non-Peak Rate</span>
              <span>${EBE_MODEL.rechargeCosts.nonPeakBlended.toFixed(3)}/kWh</span>
            </div>
            <div className="model-item">
              <span>Blended Average</span>
              <span>${EBE_MODEL.rechargeCosts.totalBlended.toFixed(3)}/kWh</span>
            </div>
            <div className="model-item">
              <span>Tariff Inflation</span>
              <span>{formatPercent(EBE_MODEL.rechargeCosts.inflationYears1to5)}/yr</span>
            </div>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="model-card">
          <h4>Operating Expenses</h4>
          <p className="card-note">{EBE_MODEL.opex.note}</p>
          <div className="model-items">
            <div className="model-item">
              <span>Host Profit Share</span>
              <span>{formatPercent(EBE_MODEL.opex.hostProfitShare)}</span>
            </div>
            <div className="model-item">
              <span>NOC License Fee</span>
              <span>{formatPercent(EBE_MODEL.opex.nocLicenseFee)} of Host</span>
            </div>
            <div className="model-item">
              <span>BSCS Maintenance</span>
              <span>${EBE_MODEL.opex.bscsMaintenancePerKw}/kW-yr</span>
            </div>
            <div className="model-item">
              <span>DCFC Maintenance</span>
              <span>${EBE_MODEL.opex.dcfcMaintenancePerCharger}/charger-yr</span>
            </div>
            <div className="model-item">
              <span>Battery Service</span>
              <span>{formatCurrency(EBE_MODEL.opex.annualBatteryMaintenance)}/yr</span>
            </div>
            <div className="model-item highlight">
              <span>Total Annual O&M</span>
              <span>{formatCurrency(EBE_MODEL.opex.totalAnnualMaintenance)}/yr</span>
            </div>
          </div>
        </div>

        {/* Battery Performance */}
        <div className="model-card">
          <h4>Battery Performance</h4>
          <p className="card-note">{EBE_MODEL.battery.note}</p>
          <div className="model-items">
            <div className="model-item">
              <span>Annual Degradation</span>
              <span>{formatPercent(EBE_MODEL.battery.annualDegradation)}</span>
            </div>
            <div className="model-item">
              <span>Year 1 Capacity</span>
              <span>{formatPercent(EBE_MODEL.battery.year1Capacity)}</span>
            </div>
            <div className="model-item">
              <span>Year 5 Capacity</span>
              <span>{formatPercent(EBE_MODEL.battery.year5Capacity)}</span>
            </div>
            <div className="model-item">
              <span>Replacement Cycle</span>
              <span>{EBE_MODEL.capex.batteryReplacementInterval} years</span>
            </div>
          </div>
        </div>

        {/* Projected Cash Flow */}
        <div className="model-card">
          <h4>Projected Cash Flow</h4>
          <p className="card-note">{EBE_MODEL.cashFlowMilestones.note}</p>
          <div className="model-items">
            <div className="model-item">
              <span>Year 1 Revenue</span>
              <span>{formatCurrency(EBE_MODEL.cashFlowMilestones.year1Revenue)}</span>
            </div>
            <div className="model-item">
              <span>Year 5 Revenue</span>
              <span>{formatCurrency(EBE_MODEL.cashFlowMilestones.year5Revenue)}</span>
            </div>
            <div className="model-item highlight">
              <span>Year 6 Revenue</span>
              <span>{formatCurrency(EBE_MODEL.cashFlowMilestones.year6Revenue)}</span>
            </div>
            <div className="model-item">
              <span>Year 10 Revenue</span>
              <span>{formatCurrency(EBE_MODEL.cashFlowMilestones.year10Revenue)}</span>
            </div>
            <div className="model-item">
              <span>Year 20 Revenue</span>
              <span>{formatCurrency(EBE_MODEL.cashFlowMilestones.year20Revenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charger Configuration */}
      <div className="charger-section">
        <h4>Charger Configuration</h4>
        <div className="charger-cards">
          {CHARGERS.map((charger) => (
            <div key={charger.id} className="charger-card">
              <div className="charger-header">
                <span className="charger-name">{charger.name}</span>
                <span className="charger-power">{charger.powerKw} kW</span>
              </div>
              <div className="charger-details">
                <span>{charger.connectors.join(" / ")}</span>
                <span className="charger-cpid">{charger.cpid}</span>
              </div>
              <p className="charger-note">{charger.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="model-footer">
        <span>Energy Balancing Engine (eBe) Model {EBE_MODEL.version}</span>
        <span className="confidential">CONFIDENTIAL — For Authorized Investor Use Only</span>
      </div>
    </section>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const FinancialInsights = () => {
  const {
    isAuthenticated,
    hasApiAccess,
    isLoading: authLoading,
    apiAccessError,
  } = useAuth();

  const { liveData, loading: liveLoading, refresh: refreshLive } = useLiveSessionData();
  const { data: sessionData, loading: sessionLoading } = useSessionSummary();
  const irrData = useIRRProjection(sessionData);
  const waterfallData = useRevenueWaterfall(sessionData, "monthly");

  if (authLoading) return <AuthLoading />;
  if (!isAuthenticated) return <LoginForm />;
  if (apiAccessError) return <AccessDenied />;

  const isLoading = liveLoading || sessionLoading;

  return (
    <div className="financial-page">
      <header className="fi-page-header">
        <div className="header-left">
          <h1>Financial Insights</h1>
          <span className="header-sub">eBe Investor Dashboard</span>
        </div>
        <div className="header-right">
          {isLoading && (
            <span className="header-loading-badge">
              <LoadingIcon />
              <span>Syncing...</span>
            </span>
          )}
          <button className="refresh-btn-icon" onClick={refreshLive} disabled={isLoading} title="Refresh">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </header>

      {/* Page-level loading indicator */}
      <PageLoadingBar isLoading={isLoading} />

      <main className="fi-main">
        <PaybackProgress data={waterfallData} irrData={irrData} />
        <EBeProjection />
        <PerformanceChart sessionData={sessionData} irrData={irrData} isLoading={isLoading} />
        <ModelCalculator />
      </main>
    </div>
  );
};

export default FinancialInsights;
