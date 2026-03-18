/**
 * Custom Tooltip Component for Recharts
 */

import React from "react";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Get the data point which contains cumulativeKwh and pricePerKwh
    const dataPoint = payload[0]?.payload;
    const avgkW = dataPoint?.avgPowerKw;
    const currSoC = dataPoint?.socPercent;
    const cumulativeKwh = dataPoint?.cumulativeKwh;
    const pricePerKwh = dataPoint?.pricePerKwh;

    // console.log(dataPoint, payload);

    return (
      <div className="chart-tooltip">
        <div className="tooltip-header">{label}</div>
        <div className="tooltip-content">
          {avgkW !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-dot" style={{ background: "#FA7315" }} />
              <span className="tooltip-name">Avg Power</span>
              <span className="tooltip-value">{avgkW.toFixed(2)} kW</span>
            </div>
          )}

          {cumulativeKwh !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-dot" style={{ background: "#0F1419" }} />
              <span className="tooltip-name">Avg Energy</span>
              <span className="tooltip-value">{cumulativeKwh} kWh</span>
            </div>
          )}
          {pricePerKwh !== undefined && pricePerKwh > 0 && (
            <div className="tooltip-row">
              <span className="tooltip-dot" style={{ background: "#0F1419" }} />
              <span className="tooltip-name">Avg $/kWh</span>
              <span className="tooltip-value">${pricePerKwh}</span>
            </div>
          )}
          {currSoC !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-dot" style={{ background: "#52525B" }} />
              <span className="tooltip-name">Current SoC</span>
              <span className="tooltip-value">{currSoC}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
