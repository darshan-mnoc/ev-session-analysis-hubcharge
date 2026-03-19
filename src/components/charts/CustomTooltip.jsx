/**
 * Custom Tooltip Component for Recharts
 */

import React from "react";
import { EnergyIcon, CostIcon, BatteryIcon } from "../common/Icons";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const avgkW = dataPoint?.avgPowerKw;
    const currSoC = dataPoint?.socPercent;
    const cumulativeKwh = dataPoint?.cumulativeKwh;
    const pricePerKwh = dataPoint?.pricePerKwh;

    return (
      <div className="chart-tooltip">
        <div className="tooltip-header">{label}</div>
        <div className="tooltip-content">
          {avgkW !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-icon power">
                <EnergyIcon size={12} />
              </span>
              <span className="tooltip-name">Power</span>
              <span className="tooltip-value">{avgkW.toFixed(2)} kW</span>
            </div>
          )}

          {cumulativeKwh !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-icon energy">
                <EnergyIcon size={12} />
              </span>
              <span className="tooltip-name">Energy</span>
              <span className="tooltip-value">{cumulativeKwh} kWh</span>
            </div>
          )}

          {pricePerKwh !== undefined && pricePerKwh > 0 && (
            <div className="tooltip-row">
              <span className="tooltip-icon cost">
                <CostIcon size={12} />
              </span>
              <span className="tooltip-name">Rate</span>
              <span className="tooltip-value">${pricePerKwh}/kWh</span>
            </div>
          )}

          {currSoC !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-icon battery">
                <BatteryIcon size={12} percent={currSoC} />
              </span>
              <span className="tooltip-name">SoC</span>
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
