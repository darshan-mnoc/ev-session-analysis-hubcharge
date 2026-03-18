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
  Legend,
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
  dualYAxis = false,
  secondaryUnit = "kWh",
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
      const timeRange = point[`timeRange_${idx}`];
      const totalDuration = point[`totalDuration_${idx}`];
      const totalDurationFormatted = point[`totalDurationFormatted_${idx}`];
      const isLastBucket = point[`isLastBucket_${idx}`];
      const stoppedEarly = point[`stoppedEarly_${idx}`];
      // For dual Y-axis mode, also get kWh and cumulative cost
      const kwh = point[`kwh_${idx}`];
      const cumulativeCost = point[`cumulativeCost_${idx}`];
      if (value != null && id != null) {
        sessions.push({
          id,
          value,
          color,
          endTime,
          endTimeFormatted,
          timeRange,
          totalDuration,
          totalDurationFormatted,
          isLastBucket,
          stoppedEarly,
          kwh,
          cumulativeCost,
        });
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
      // Dual Y-axis data
      dualYAxis,
      kwh_average: point.kwh_average ?? 0,
      kwh_median: point.kwh_median ?? 0,
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
    <ResponsiveContainer width="100%" height="100%" minHeight={280}>
      <ComposedChart
        data={data}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: "crosshair", outline: "none" }}
        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
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
          yAxisId="left"
          stroke="var(--text-muted)"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          domain={dualYAxis ? [0, "auto"] : ["auto", "auto"]}
          tickFormatter={dualYAxis ? (v) => `$${v.toFixed(0)}` : undefined}
          label={{
            value: unit,
            position: "insideLeft",
            fill: "var(--text-secondary)",
            fontSize: 11,
          }}
        />
        {dualYAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="var(--text-muted)"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#3b82f6", fontSize: 11 }}
            domain={[0, "auto"]}
            tickFormatter={(v) => v.toFixed(0)}
            label={{
              value: secondaryUnit,
              position: "insideRight",
              fill: "#3b82f6",
              fontSize: 11,
            }}
          />
        )}

        {/* Enhanced tooltip with insights */}
        <Tooltip
          content={({ label, payload }) => {
            if (label == null || !payload || payload.length === 0) return null;
            const pointData = payload[0]?.payload || {};

            // Count valid sessions and collect values + time ranges
            let carCount = 0;
            const values = [];
            const kwhValues = [];
            const costValues = [];
            const endTimes = [];
            const timeRanges = [];
            Object.keys(pointData).forEach((key) => {
              if (key.startsWith("session_")) {
                const idx = key.replace("session_", "");
                if (pointData[key] != null && pointData[`id_${idx}`] != null) {
                  carCount++;
                  values.push(pointData[key]);
                  if (pointData[`endTime_${idx}`] != null) {
                    endTimes.push(pointData[`endTime_${idx}`]);
                  }
                  if (pointData[`timeRange_${idx}`]) {
                    timeRanges.push(pointData[`timeRange_${idx}`]);
                  }
                  // For dual Y-axis, collect kWh and cost values
                  if (dualYAxis) {
                    if (pointData[`kwh_${idx}`] != null) {
                      kwhValues.push(pointData[`kwh_${idx}`]);
                    }
                    if (pointData[`cumulativeCost_${idx}`] != null) {
                      costValues.push(pointData[`cumulativeCost_${idx}`]);
                    }
                  }
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
            const xLabel =
              xAxisKey === "soc"
                ? `${label}%`
                : xAxisKey === "kwh"
                  ? `${label} kWh`
                  : `${label} min`;

            // Calculate time range span for time-based charts
            const minEndTime =
              endTimes.length > 0 ? Math.min(...endTimes) : null;
            const maxEndTime =
              endTimes.length > 0 ? Math.max(...endTimes) : null;
            const formatTime = (t) => {
              const mins = Math.floor(t);
              const secs = Math.round((t - mins) * 60);
              return `${mins}:${secs.toString().padStart(2, "0")}`;
            };
            const timeRangeLabel =
              minEndTime !== null && xAxisKey !== "soc"
                ? minEndTime === maxEndTime
                  ? formatTime(minEndTime)
                  : `${formatTime(minEndTime)} - ${formatTime(maxEndTime)}`
                : null;

            // Calculate kWh stats for dual Y-axis
            const kwhAvg =
              kwhValues.length > 0
                ? kwhValues.reduce((a, b) => a + b, 0) / kwhValues.length
                : (pointData.kwh_average ?? 0);
            const costAvg =
              costValues.length > 0
                ? costValues.reduce((a, b) => a + b, 0) / costValues.length
                : 0;

            return (
              <div className="chart-tooltip-enhanced">
                <div className="tooltip-header-row">
                  <span className="tooltip-x-label">{xLabel}</span>
                  <span className="tooltip-car-count">{carCount} sessions</span>
                </div>
                {timeRangeLabel && (
                  <div className="tooltip-time-range">
                    <span className="time-range-label">
                      End times: {timeRangeLabel}
                    </span>
                  </div>
                )}
                {dualYAxis ? (
                  <>
                    <div className="tooltip-dual-stats">
                      <div className="tooltip-stat-group">
                        <span
                          className="stat-group-label"
                          style={{ color: accentColor }}
                        >
                          $/kWh
                        </span>
                        <div className="tooltip-stat">
                          <span className="stat-label">Avg</span>
                          <span className="stat-value">${avg.toFixed(2)}</span>
                        </div>
                        <div className="tooltip-stat">
                          <span className="stat-label">Range</span>
                          <span className="stat-value">
                            ${min.toFixed(2)} - ${max.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="tooltip-stat-group">
                        <span
                          className="stat-group-label"
                          style={{ color: "#3b82f6" }}
                        >
                          kWh
                        </span>
                        <div className="tooltip-stat">
                          <span className="stat-label">Avg</span>
                          <span className="stat-value">
                            {kwhAvg.toFixed(2)}
                          </span>
                        </div>
                        {costAvg > 0 && (
                          <div className="tooltip-stat">
                            <span className="stat-label">Cost</span>
                            <span className="stat-value">
                              ${costAvg.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="tooltip-percentiles">
                      <span>
                        80% of sessions: ${p10.toFixed(2)} - ${p90.toFixed(2)}{" "}
                        /kWh
                      </span>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
              yAxisId="left"
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
              yAxisId="left"
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
              yAxisId="left"
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
              yAxisId="left"
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
              yAxisId="left"
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

        {/* Primary average line ($/kWh or other metric) */}
        <Line
          type="monotone"
          dataKey="average"
          yAxisId="left"
          stroke={accentColor}
          strokeWidth={2.5}
          dot={false}
          activeDot={{
            r: 5,
            fill: accentColor,
            stroke: "#fff",
            strokeWidth: 1.5,
          }}
          name="Average"
        />

        {/* Secondary kWh line for dual Y-axis mode */}
        {dualYAxis && (
          <Line
            type="monotone"
            dataKey="kwh_average"
            yAxisId="right"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: "#3b82f6",
              stroke: "#fff",
              strokeWidth: 1.5,
            }}
            name="Energy (kWh)"
          />
        )}

        {/* Legend for dual Y-axis mode */}
        {dualYAxis && (
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              if (value === "Average")
                return <span style={{ color: accentColor }}>$/kWh (Avg)</span>;
              if (value === "Energy (kWh)")
                return <span style={{ color: "#3b82f6" }}>kWh (Avg)</span>;
              return value;
            }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default PerformanceBandChart;
