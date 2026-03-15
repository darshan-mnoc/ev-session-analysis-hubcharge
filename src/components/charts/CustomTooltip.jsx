/**
 * Custom Tooltip Component for Recharts
 */

import React from "react";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="tooltip-header">{label}</div>
        <div className="tooltip-content">
          {payload.map((entry, index) => (
            <div key={index} className="tooltip-row">
              <span
                className="tooltip-dot"
                style={{ background: entry.color }}
              />
              <span className="tooltip-name">{entry.name}</span>
              <span className="tooltip-value">
                {typeof entry.value === "number"
                  ? entry.value.toFixed(2)
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

export default CustomTooltip;
