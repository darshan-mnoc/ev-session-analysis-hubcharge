/**
 * Performance Band Chart Component
 * Displays performance data with percentile bands or individual lines
 */

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  Line,
} from "recharts";
import { INDIVIDUAL_THRESHOLD } from "../../constants/config";

const PerformanceBandChart = ({
  data,
  unit,
  accentColor = "#22c55e",
  sessionCount,
  colors,
  chartLabel = "",
  xAxisKey = "minute",
  xAxisLabel = "Minutes",
  onHover,
  onPointClick,
}) => {
  // console.log("Data for PerformanceBandChart:", data);
  const showIndividual = sessionCount <= INDIVIDUAL_THRESHOLD;
  const gradId = `gb_${unit.replace(/\W/g, "")}_${accentColor.replace(/\W/g, "")}`;

  const extractPoint = (label) => {
    const point = data.find((d) => d[xAxisKey] === label);
    if (!point) return null;
    const sessions = [];
    // Find all session keys and extract data for each
    const sessionKeys = Object.keys(point).filter((k) =>
      k.startsWith("session_"),
    );
    sessionKeys.forEach((key) => {
      const idx = key.replace("session_", "");
      const value = point[key];
      const id = point[`id_${idx}`];
      const color = point[`color_${idx}`];
      const endTime = point[`endTime_${idx}`];
      const endTimeFormatted = point[`endTimeFormatted_${idx}`];
      if (value != null && id != null) {
        sessions.push({ id, value, color, endTime, endTimeFormatted });
      }
    });
    return {
      [xAxisKey]: point[xAxisKey],
      minute: point.minute ?? point.soc,
      sessions,
      median: point.median ?? point.average ?? 0,
      p10: point.band_outer_base ?? 0,
      p90: (point.band_outer_base ?? 0) + (point.band_outer_delta ?? 0),
      p25: point.band_inner_base ?? 0,
      p75: (point.band_inner_base ?? 0) + (point.band_inner_delta ?? 0),
      showBands: !showIndividual,
      unit,
      chartLabel,
      xAxisKey,
    };
  };

  const handleMouseMove = (state) => {
    if (!state?.activeLabel) return;
    onHover?.(extractPoint(state.activeLabel));
  };

  const handleMouseLeave = () => onHover?.(null);

  const handleClick = (state) => {
    if (!state?.activeLabel) return;
    onPointClick?.(extractPoint(state.activeLabel));
  };

  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart
        data={data}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: "crosshair", outline: "none" }}
      >
        <defs>
          <linearGradient id={`${gradId}_outer`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id={`${gradId}_inner`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.38} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0.12} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey={xAxisKey}
          axisLine={false}
          tickLine={false}
          stroke="var(--text-muted)"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
        />
        <YAxis
          stroke="var(--text-muted)"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          label={{
            value: unit,
            position: "insideLeft",
            fill: "var(--text-secondary)",
            fontSize: 11,
          }}
        />

        {/* Enhanced tooltip with insights */}
        <Tooltip
          content={({ label, payload }) => {
            if (label == null || !payload || payload.length === 0) return null;
            const pointData = payload[0]?.payload || {};

            // Count valid sessions and collect values
            let carCount = 0;
            const values = [];
            Object.keys(pointData).forEach((key) => {
              if (key.startsWith("session_")) {
                const idx = key.replace("session_", "");
                if (pointData[key] != null && pointData[`id_${idx}`] != null) {
                  carCount++;
                  values.push(pointData[key]);
                }
              }
            });

            if (values.length === 0) return null;

            const sortedVals = [...values].sort((a, b) => a - b);
            const avg =
              pointData.average ??
              values.reduce((a, b) => a + b, 0) / values.length;
            const median =
              pointData.median ?? sortedVals[Math.floor(sortedVals.length / 2)];
            const min = sortedVals[0];
            const max = sortedVals[sortedVals.length - 1];
            const p10 = pointData.band_outer_base ?? min;
            const p90 =
              (pointData.band_outer_base ?? 0) +
                (pointData.band_outer_delta ?? 0) || max;
            const xLabel = xAxisKey === "soc" ? `${label}%` : `${label} min`;

            return (
              <div className="chart-tooltip-enhanced">
                <div className="tooltip-header-row">
                  <span className="tooltip-x-label">{xLabel}</span>
                  <span className="tooltip-car-count">{carCount} sessions</span>
                </div>
                <div className="tooltip-main-stats">
                  <div className="tooltip-stat">
                    <span className="stat-label">Avg</span>
                    <span className="stat-value">{avg.toFixed(1)}</span>
                  </div>
                  <div className="tooltip-stat">
                    <span className="stat-label">Med</span>
                    <span className="stat-value">{median.toFixed(1)}</span>
                  </div>
                  <div className="tooltip-stat">
                    <span className="stat-label">Range</span>
                    <span className="stat-value">
                      {min.toFixed(1)} - {max.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="tooltip-percentiles">
                  <span>
                    80% of sessions fall between {p10.toFixed(1)} -{" "}
                    {p90.toFixed(1)} {unit}
                  </span>
                </div>
              </div>
            );
          }}
          wrapperStyle={{ outline: "none" }}
        />

        {showIndividual ? (
          Array.from({ length: sessionCount }).map((_, i) => (
            <Line
              key={`s_${i}`}
              type="monotone"
              dataKey={`session_${i}`}
              stroke={colors[i]}
              strokeWidth={1.5}
              dot={false}
              opacity={0.7}
              legendType="none"
            />
          ))
        ) : (
          <>
            <Area
              type="monotone"
              dataKey="band_outer_base"
              stackId="outer"
              stroke="none"
              fill="transparent"
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="band_outer_delta"
              stackId="outer"
              stroke={accentColor}
              strokeWidth={0.5}
              strokeOpacity={0.2}
              fill={`url(#${gradId}_outer)`}
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="band_inner_base"
              stackId="inner"
              stroke="none"
              fill="transparent"
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="band_inner_delta"
              stackId="inner"
              stroke="none"
              fill={`url(#${gradId}_inner)`}
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />
          </>
        )}

        <Line
          type="monotone"
          dataKey={showIndividual ? "average" : "average"}
          stroke={accentColor}
          strokeWidth={2.5}
          dot={false}
          activeDot={{
            r: 5,
            fill: accentColor,
            stroke: "#fff",
            strokeWidth: 1.5,
          }}
          name={showIndividual ? "Average" : "Average"}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default PerformanceBandChart;
