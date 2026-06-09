/**
 * IRR Projection Panel Component
 * Displays IRR metrics, trajectory chart, and lever impacts
 */

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { EnergyIcon, ClockIcon, CostIcon } from "../common/Icons";
import { EBE_MODEL } from "../../constants/ebeModel";

// Custom tooltip for IRR chart
const IRRTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="fi-tooltip">
        <div className="fi-tooltip-header">Year {label}</div>
        <div className="fi-tooltip-content">
          {payload.map((entry, index) => (
            <div key={index} className="fi-tooltip-row">
              <span
                className="fi-tooltip-dot"
                style={{ backgroundColor: entry.color }}
              />
              <span className="fi-tooltip-name">{entry.name}</span>
              <span className="fi-tooltip-value">
                {entry.value?.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// KPI Card component
const KPICard = ({ title, value, subtitle, status, icon }) => {
  return (
    <div className={`irr-kpi-card ${status}`}>
      <div className="kpi-header">
        <span className="kpi-icon">{icon}</span>
        <span className="kpi-title">{title}</span>
      </div>
      <div className="kpi-value">{value}</div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
    </div>
  );
};

// Lever Card component
const LeverCard = ({ title, irrDelta, description }) => {
  const isPositive = irrDelta >= 0;
  return (
    <div className="irr-lever-card">
      <div className="lever-title">{title}</div>
      <div className={`lever-delta ${isPositive ? "positive" : "negative"}`}>
        {isPositive ? "+" : ""}
        {irrDelta.toFixed(1)}% IRR
      </div>
      {description && <div className="lever-description">{description}</div>}
    </div>
  );
};

const IRRProjectionPanel = ({ irrData, loading }) => {
  if (loading || !irrData) {
    return (
      <div className="fi-card irr-panel-card">
        <div className="fi-card-header">
          <h3>IRR Projection</h3>
        </div>
        <div className="irr-loading">
          <div className="skeleton-kpis">
            <div className="skeleton-kpi" />
            <div className="skeleton-kpi" />
            <div className="skeleton-kpi" />
          </div>
          <div className="skeleton-chart tall" />
        </div>
      </div>
    );
  }

  const {
    currentIRR,
    irrDelta,
    paybackPeriod,
    trajectoryData,
    baselineData,
    levers,
  } = irrData;

  // Determine IRR status
  const getIRRStatus = (irr) => {
    if (irr >= 15) return "excellent";
    if (irr >= 10) return "good";
    return "warning";
  };

  // Combine trajectory data for chart
  const chartData = trajectoryData.map((point, index) => ({
    year: point.year,
    currentTrajectory: point.irr,
    baseline: baselineData[index]?.irr || EBE_MODEL.targets.baselineIRR,
    targetMin: EBE_MODEL.targets.targetIRRMin,
    targetMax: EBE_MODEL.targets.targetIRRMax,
  }));

  // Format payback period
  const formatPayback = (years) => {
    if (years >= 20) return ">20 years";
    const y = Math.floor(years);
    const m = Math.round((years - y) * 12);
    if (m === 0) return `${y} years`;
    return `${y}y ${m}m`;
  };

  return (
    <div className="fi-card irr-panel-card">
      <div className="fi-card-header">
        <h3>IRR Projection (20-Year)</h3>
      </div>

      {/* KPI Cards */}
      <div className="irr-kpi-row">
        <KPICard
          title="Current Projected IRR"
          value={`${currentIRR.toFixed(2)}%`}
          subtitle="Based on actual revenue run rate"
          status={getIRRStatus(currentIRR)}
          icon={<EnergyIcon size={14} />}
        />
        <KPICard
          title="Payback Period"
          value={formatPayback(paybackPeriod)}
          subtitle={`Net capex: $${(EBE_MODEL.incentives.netEffectiveCapex / 1000).toFixed(0)}K`}
          status={paybackPeriod <= 7 ? "excellent" : paybackPeriod <= 10 ? "good" : "warning"}
          icon={<ClockIcon size={14} />}
        />
        <KPICard
          title="IRR vs. Model"
          value={`${irrDelta >= 0 ? "+" : ""}${irrDelta.toFixed(2)}%`}
          subtitle={`Baseline: ${EBE_MODEL.targets.baselineIRR}%`}
          status={irrDelta >= 0 ? "excellent" : irrDelta >= -2 ? "good" : "warning"}
          icon={<CostIcon size={14} />}
        />
      </div>

      {/* IRR Trajectory Chart */}
      <div className="irr-chart-container">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="targetBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--green)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--green)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              label={{
                value: "Year",
                position: "insideBottomRight",
                offset: -5,
                fill: "var(--text-muted)",
                fontSize: 10,
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              domain={[-5, 25]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<IRRTooltip />} />
            <Legend verticalAlign="top" height={36} iconType="line" />

            {/* Target band (15-20%) */}
            <Area
              type="monotone"
              dataKey="targetMax"
              stroke="none"
              fill="url(#targetBand)"
              name="Target Band (15-20%)"
            />
            <ReferenceLine
              y={EBE_MODEL.targets.targetIRRMin}
              stroke="var(--green)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={EBE_MODEL.targets.targetIRRMax}
              stroke="var(--green)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />

            {/* Baseline model trajectory */}
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="var(--text-muted)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Model Baseline (13.16%)"
            />

            {/* Current trajectory */}
            <Line
              type="monotone"
              dataKey="currentTrajectory"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={false}
              name="Current Trajectory"
              activeDot={{ r: 4, fill: "var(--accent)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Lever Impact Cards */}
      <div className="irr-levers-section">
        <h4 className="levers-title">IRR Lever Summary</h4>
        <div className="irr-levers-row">
          <LeverCard
            title="Raise extensions $3 → $4.50"
            irrDelta={levers.extensionOptimization?.irrDelta || 3.2}
            description={`+$${((levers.extensionOptimization?.annualRevenueIncrease || 18000) / 1000).toFixed(0)}K/year`}
          />
          <LeverCard
            title="25 sessions/day vs 20"
            irrDelta={levers.sessionsIncrease || 2.1}
            description="Increased utilization"
          />
          <LeverCard
            title="Both combined"
            irrDelta={levers.combined - currentIRR || 5.3}
            description={`Target: ${(levers.combined || 18.4).toFixed(1)}% IRR`}
          />
        </div>
      </div>
    </div>
  );
};

export default IRRProjectionPanel;
