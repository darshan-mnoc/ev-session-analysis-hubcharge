/**
 * Revenue Waterfall Card Component
 * Shows revenue flow breakdown with deductions
 */

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { EnergyIcon, CostIcon } from "../common/Icons";

// Custom waterfall tooltip
const WaterfallTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPositive = data.type === "positive" || data.type === "total";
    return (
      <div className="fi-tooltip">
        <div className="fi-tooltip-header">{data.name}</div>
        <div className="fi-tooltip-content">
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-name">Amount</span>
            <span
              className={`fi-tooltip-value ${isPositive ? "positive" : "negative"}`}
            >
              {data.value >= 0 ? "+" : ""}$
              {Math.abs(data.value).toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <div className="fi-tooltip-row">
            <span className="fi-tooltip-name">Running Total</span>
            <span className="fi-tooltip-value">
              $
              {data.cumulative.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Progress bar component
const PaybackProgressBar = ({ progress, remaining, total }) => {
  return (
    <div className="payback-progress">
      <div className="payback-header">
        <span className="payback-label">Progress to Payback</span>
        <span className="payback-value">{progress.toFixed(1)}%</span>
      </div>
      <div className="payback-bar">
        <div
          className="payback-fill"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <div className="payback-footer">
        <span className="payback-remaining">
          ${(remaining / 1000).toFixed(0)}K remaining
        </span>
        <span className="payback-total">
          of ${(total / 1000).toFixed(0)}K net capex
        </span>
      </div>
    </div>
  );
};

const RevenueWaterfallCard = ({ waterfallData, loading }) => {
  const [period, setPeriod] = useState("monthly");

  if (loading || !waterfallData) {
    return (
      <div className="fi-card waterfall-card">
        <div className="fi-card-header">
          <h3>Revenue Waterfall</h3>
        </div>
        <div className="waterfall-loading">
          <div className="skeleton-chart tall" />
        </div>
      </div>
    );
  }

  const {
    waterfallData: data,
    cumulativeCashFlow,
    remainingToPayback,
    netCapex,
    paybackProgress,
  } = waterfallData;

  // Transform data for waterfall display
  // For waterfall, we need to calculate the "start" position for each bar
  const chartData = data.map((item, index) => {
    let start = 0;
    if (index > 0 && item.type !== "total") {
      // Start where the previous item's cumulative ended
      start = data[index - 1].cumulative;
    }

    return {
      ...item,
      start: item.type === "total" ? 0 : start,
      barValue: item.type === "total" ? item.value : Math.abs(item.value),
    };
  });

  // Get colors for bars
  const getBarColor = (type) => {
    switch (type) {
      case "positive":
        return "var(--green)";
      case "negative":
        return "var(--red)";
      case "total":
        return "var(--accent)";
      default:
        return "var(--text-muted)";
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return `$${Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <div className="fi-card waterfall-card">
      <div className="fi-card-header">
        <h3>Revenue Waterfall</h3>
        <div className="waterfall-toggle">
          <button
            className={`toggle-btn ${period === "monthly" ? "active" : ""}`}
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            className={`toggle-btn ${period === "annual" ? "active" : ""}`}
            onClick={() => setPeriod("annual")}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="waterfall-content">
        {/* Waterfall Chart */}
        <div className="waterfall-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
              barCategoryGap="20%"
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
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<WaterfallTooltip />} />
              <ReferenceLine y={0} stroke="var(--border)" />

              {/* Invisible bar for positioning */}
              <Bar dataKey="start" stackId="stack" fill="transparent" />

              {/* Visible bar with values */}
              <Bar
                dataKey="barValue"
                stackId="stack"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry.type)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar labels with values */}
        <div className="waterfall-labels">
          {data.map((item, index) => (
            <div
              key={index}
              className={`waterfall-label ${item.type}`}
            >
              <span className="label-name">{item.name}</span>
              <span className="label-value">
                {item.value >= 0 ? "+" : "-"}
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
        </div>

        {/* Cash Flow Summary */}
        <div className="waterfall-summary">
          <div className="summary-item">
            <span className="summary-icon">
              <CostIcon size={12} />
            </span>
            <span className="summary-label">Cumulative Cash Flow to Date</span>
            <span className="summary-value positive">
              ${cumulativeCashFlow.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        </div>

        {/* Payback Progress */}
        <PaybackProgressBar
          progress={paybackProgress}
          remaining={remainingToPayback}
          total={netCapex}
        />
      </div>
    </div>
  );
};

export default RevenueWaterfallCard;
