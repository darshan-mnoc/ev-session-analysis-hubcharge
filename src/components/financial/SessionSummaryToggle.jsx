/**
 * Session Performance vs. Model Component
 * Shows Daily/Weekly/Monthly/Yearly comparison with actual vs projected
 * Includes IRR trajectory lines
 */

import React, { useState, useMemo } from "react";
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
import { EnergyIcon, CarIcon, CostIcon, ClockIcon } from "../common/Icons";
import { EBE_MODEL } from "../../constants/ebeModel";

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="fi-tooltip">
        <div className="fi-tooltip-header">{label}</div>
        <div className="fi-tooltip-content">
          {payload.map((entry, index) => (
            <div key={index} className="fi-tooltip-row">
              <span
                className="fi-tooltip-dot"
                style={{ backgroundColor: entry.color }}
              />
              <span className="fi-tooltip-name">{entry.name}</span>
              <span className="fi-tooltip-value">
                {typeof entry.value === "number"
                  ? entry.dataKey.includes("IRR")
                    ? `${entry.value.toFixed(1)}%`
                    : entry.value.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Delta indicator component
const DeltaIndicator = ({ value, suffix = "%" }) => {
  const isPositive = value >= 0;
  return (
    <span className={`delta-indicator ${isPositive ? "positive" : "negative"}`}>
      {isPositive ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
};

// Period selector dropdown
const PeriodSelector = ({ options, selected, onSelect, label }) => (
  <div className="period-selector">
    <label>{label}</label>
    <select value={selected} onChange={(e) => onSelect(e.target.value)}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const SessionSummaryToggle = ({ data, irrData, loading }) => {
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  const tabs = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "yearly", label: "Yearly" },
  ];

  // Get year of operation based on system go-live date
  const yearOfOperation = useMemo(() => {
    if (!data?.systemGoLiveDate) return 1;
    const goLive = new Date(data.systemGoLiveDate);
    const now = new Date();
    const years = (now - goLive) / (365 * 24 * 60 * 60 * 1000);
    return Math.max(1, Math.ceil(years));
  }, [data?.systemGoLiveDate]);

  // Get projected sessions/day based on year of operation
  const getProjectedSessionsPerDay = (year) => {
    // Year 1-5: 13 sessions/day, Year 6+: 18 sessions/day per eBe model
    return year <= 5
      ? EBE_MODEL.utilization.sessionsPerDayYear1to5
      : EBE_MODEL.utilization.sessionsPerDayYear6to20;
  };

  // Format helpers
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value, decimals = 1) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Generate chart data based on active tab
  const chartData = useMemo(() => {
    if (!data) return [];

    const sessionsPerDay = getProjectedSessionsPerDay(yearOfOperation);
    const kwhPerSession = EBE_MODEL.evCharging.energyPerSession;
    const blendedRate = EBE_MODEL.evCharging.blendedEvRate;

    // Get IRR data for trajectory lines
    const currentIRR = irrData?.currentIRR || 0;
    const baselineIRR = EBE_MODEL.targets.baselineIRR;

    if (activeTab === "daily") {
      // Last 7 days
      const dailyData = data.weekly?.chartData || [];
      return dailyData.map((d, idx) => ({
        name: d.name,
        actualSessions: d.actualSessions || 0,
        projectedSessions: sessionsPerDay,
        actualRevenue: d.actualRevenue || 0,
        projectedRevenue: sessionsPerDay * kwhPerSession * blendedRate,
        currentIRR: currentIRR,
        baselineIRR: baselineIRR,
      }));
    }

    if (activeTab === "weekly") {
      // Last 4-8 weeks
      const weeklyData = data.monthly?.chartData || [];
      const weeksData = [];
      const now = new Date();

      // Generate last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        const weekLabel = `Week ${4 - i}`;
        const daysInWeek = 7;

        // Find matching data
        const matchingData = weeklyData.find((d) => {
          const dDate = new Date(d.date);
          return dDate >= weekStart && dDate <= weekEnd;
        });

        weeksData.push({
          name: weekLabel,
          actualSessions: matchingData?.actualSessions || 0,
          projectedSessions: sessionsPerDay * daysInWeek,
          actualRevenue: matchingData?.actualRevenue || 0,
          projectedRevenue: sessionsPerDay * daysInWeek * kwhPerSession * blendedRate,
          currentIRR: currentIRR,
          baselineIRR: baselineIRR,
        });
      }
      return weeksData;
    }

    if (activeTab === "monthly") {
      // Last 12 months
      const monthlyData = data.yearly?.chartData || [];
      return monthlyData.slice(-12).map((d) => {
        const daysInMonth = new Date(
          new Date(d.date).getFullYear(),
          new Date(d.date).getMonth() + 1,
          0
        ).getDate();

        return {
          name: d.name,
          actualSessions: d.actualSessions || 0,
          projectedSessions: sessionsPerDay * daysInMonth,
          actualRevenue: d.actualRevenue || 0,
          projectedRevenue: sessionsPerDay * daysInMonth * kwhPerSession * blendedRate,
          currentIRR: currentIRR,
          baselineIRR: baselineIRR,
        };
      });
    }

    if (activeTab === "yearly") {
      // Show yearly projection (Yr1, Yr5, Yr10, Yr15, Yr20)
      const yearMarkers = [1, 5, 10, 15, 20];
      const trajectoryData = irrData?.trajectoryData || [];
      const baselineData = irrData?.baselineData || [];

      return yearMarkers.map((yr) => {
        const sessionsPerDayForYear = getProjectedSessionsPerDay(yr);
        const projectedAnnualSessions = sessionsPerDayForYear * 365;
        const projectedAnnualRevenue = projectedAnnualSessions * kwhPerSession * blendedRate;

        // Get IRR at this year
        const currentTrajectory = trajectoryData.find((t) => t.year === yr);
        const baseline = baselineData.find((t) => t.year === yr);

        // Only show actual data for current year
        const isCurrentOrPast = yr <= yearOfOperation;
        const actualSessions = yr === yearOfOperation && data.yearly
          ? data.yearly.actual.sessions
          : 0;
        const actualRevenue = yr === yearOfOperation && data.yearly
          ? data.yearly.actual.revenue
          : 0;

        return {
          name: `Yr ${yr}`,
          actualSessions: isCurrentOrPast ? actualSessions : null,
          projectedSessions: projectedAnnualSessions,
          actualRevenue: isCurrentOrPast ? actualRevenue : null,
          projectedRevenue: projectedAnnualRevenue,
          currentIRR: currentTrajectory?.irr || 0,
          baselineIRR: baseline?.irr || baselineIRR,
        };
      });
    }

    return [];
  }, [data, activeTab, yearOfOperation, irrData]);

  // Calculate period totals
  const periodTotals = useMemo(() => {
    if (!chartData.length) {
      return {
        actualSessions: 0,
        projectedSessions: 0,
        actualRevenue: 0,
        projectedRevenue: 0,
        sessionsDelta: 0,
        revenueDelta: 0,
      };
    }

    const actualSessions = chartData.reduce((sum, d) => sum + (d.actualSessions || 0), 0);
    const projectedSessions = chartData.reduce((sum, d) => sum + (d.projectedSessions || 0), 0);
    const actualRevenue = chartData.reduce((sum, d) => sum + (d.actualRevenue || 0), 0);
    const projectedRevenue = chartData.reduce((sum, d) => sum + (d.projectedRevenue || 0), 0);

    return {
      actualSessions,
      projectedSessions,
      actualRevenue,
      projectedRevenue,
      sessionsDelta: projectedSessions > 0
        ? ((actualSessions - projectedSessions) / projectedSessions) * 100
        : 0,
      revenueDelta: projectedRevenue > 0
        ? ((actualRevenue - projectedRevenue) / projectedRevenue) * 100
        : 0,
    };
  }, [chartData]);

  if (loading || !data) {
    return (
      <div className="fi-card session-summary-card">
        <div className="fi-card-header">
          <h3>Session Performance vs. Model</h3>
        </div>
        <div className="summary-loading">
          <div className="skeleton-tabs" />
          <div className="skeleton-chart" />
        </div>
      </div>
    );
  }

  return (
    <div className="fi-card session-summary-card">
      <div className="fi-card-header">
        <h3>Session Performance vs. Model</h3>
        <div className="summary-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`summary-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="summary-content">
        {/* Year of Operation Badge */}
        <div className="year-badge">
          <span className="year-label">Year of Operation:</span>
          <span className="year-value">{yearOfOperation}</span>
          <span className="year-note">
            (Projected: {getProjectedSessionsPerDay(yearOfOperation)} sessions/day)
          </span>
        </div>

        {/* Combined Chart with Bars and IRR Lines */}
        <div className="summary-chart">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 60, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              />
              <YAxis
                yAxisId="sessions"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                label={{
                  value: "Sessions",
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--text-muted)",
                  fontSize: 10,
                }}
              />
              <YAxis
                yAxisId="irr"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                domain={[-10, 30]}
                tickFormatter={(v) => `${v}%`}
                label={{
                  value: "IRR %",
                  angle: 90,
                  position: "insideRight",
                  fill: "var(--text-muted)",
                  fontSize: 10,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="rect"
                iconSize={10}
              />

              {/* Projected Sessions Bar */}
              <Bar
                yAxisId="sessions"
                dataKey="projectedSessions"
                name="Projected"
                fill="var(--text-muted)"
                radius={[4, 4, 0, 0]}
                opacity={0.4}
                barSize={20}
              />

              {/* Actual Sessions Bar */}
              <Bar
                yAxisId="sessions"
                dataKey="actualSessions"
                name="Actual"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />

              {/* Current IRR Trajectory Line */}
              <Line
                yAxisId="irr"
                type="monotone"
                dataKey="currentIRR"
                name="Current IRR"
                stroke="var(--green)"
                strokeWidth={2}
                dot={{ fill: "var(--green)", r: 3 }}
                activeDot={{ r: 5 }}
              />

              {/* Baseline IRR Line */}
              <Line
                yAxisId="irr"
                type="monotone"
                dataKey="baselineIRR"
                name="Baseline IRR"
                stroke="var(--text-muted)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Row */}
        <div
          className={`summary-delta-row ${periodTotals.sessionsDelta >= 0 ? "positive" : "negative"}`}
        >
          <span className="delta-message">
            Actual is{" "}
            <strong>
              {Math.abs(periodTotals.sessionsDelta).toFixed(1)}%{" "}
              {periodTotals.sessionsDelta >= 0 ? "above" : "below"}
            </strong>{" "}
            model projection for sessions
          </span>
        </div>

        {/* Metrics Summary */}
        <div className="summary-metrics-row">
          <div className="summary-metric">
            <span className="metric-icon"><CarIcon size={12} /></span>
            <div className="metric-content">
              <span className="metric-label">Actual Sessions</span>
              <span className="metric-value">{periodTotals.actualSessions.toLocaleString()}</span>
            </div>
          </div>
          <div className="summary-metric">
            <span className="metric-icon"><CarIcon size={12} /></span>
            <div className="metric-content">
              <span className="metric-label">Projected Sessions</span>
              <span className="metric-value">{periodTotals.projectedSessions.toLocaleString()}</span>
            </div>
          </div>
          <div className="summary-metric">
            <span className="metric-icon"><CostIcon size={12} /></span>
            <div className="metric-content">
              <span className="metric-label">Actual Revenue</span>
              <span className="metric-value">{formatCurrency(periodTotals.actualRevenue)}</span>
            </div>
          </div>
          <div className="summary-metric">
            <span className="metric-icon"><CostIcon size={12} /></span>
            <div className="metric-content">
              <span className="metric-label">Projected Revenue</span>
              <span className="metric-value">{formatCurrency(periodTotals.projectedRevenue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionSummaryToggle;
