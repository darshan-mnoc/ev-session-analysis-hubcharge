/**
 * Chart Card Component
 * Displays a chart with title and optional secondary data
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
} from "recharts";
import CustomTooltip from "./CustomTooltip";

const ChartCard = ({
  title,
  data,
  dataKey,
  color,
  unit,
  secondaryDataKey,
  secondaryColor,
  secondaryUnit,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-empty">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`gradient-${dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              {secondaryDataKey && (
                <linearGradient
                  id={`gradient-${secondaryDataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={secondaryColor}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={secondaryColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              dx={-10}
              domain={["auto", "auto"]}
            />
            {secondaryDataKey && (
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
                dx={10}
                domain={["auto", "auto"]}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: "10px" }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 6,
                fill: color,
                stroke: "#1e293b",
                strokeWidth: 2,
              }}
              name={`${dataKey.replace(/([A-Z])/g, " $1").trim()} (${unit})`}
            />
            {secondaryDataKey && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={secondaryColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: secondaryColor,
                  stroke: "#1e293b",
                  strokeWidth: 2,
                }}
                name={`${secondaryDataKey.replace(/([A-Z])/g, " $1").trim()} (${secondaryUnit})`}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartCard;
