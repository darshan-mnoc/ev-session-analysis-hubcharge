/**
 * Custom Tooltip Component for Recharts
 * @param {string} chartType - "voltage-current" | "power-soc" | "traffic" | default (shows all)
 */

import React from "react";
import {
  EnergyIcon,
  CostIcon,
  BatteryIcon,
  VoltageIcon,
  CurrentIcon,
  ChargerIcon,
} from "../common/Icons";

const CustomTooltip = ({ active, payload, label, chartType }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const avgkW = dataPoint?.avgPowerKw;
    const currSoC = dataPoint?.socPercent;
    const cumulativeKwh = dataPoint?.cumulativeKwh;
    const pricePerKwh = dataPoint?.pricePerKwh;
    const avgVoltage = dataPoint?.avgVoltageV;
    const avgCurrent = dataPoint?.avgCurrentA;
    const sessionCount = dataPoint?.count || dataPoint?.sessions;

    // Determine what to show based on chartType
    const showVoltageCurrentOnly = chartType === "voltage-current";
    const showPowerSocOnly = chartType === "power-soc";
    const showTraffic = chartType === "traffic";

    return (
      <div className="chart-tooltip">
        <div className="tooltip-header">{label}</div>
        <div className="tooltip-content">
          {/* Traffic chart - show session count */}
          {showTraffic && sessionCount !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-icon power">
                <ChargerIcon size={12} />
              </span>
              <span className="tooltip-name">Sessions</span>
              <span className="tooltip-value">{sessionCount}</span>
            </div>
          )}

          {/* Power/SoC chart fields */}
          {!showVoltageCurrentOnly && !showTraffic && avgkW !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-icon power">
                <EnergyIcon size={12} />
              </span>
              <span className="tooltip-name">Power</span>
              <span className="tooltip-value">{avgkW.toFixed(2)} kW</span>
            </div>
          )}

          {!showVoltageCurrentOnly && !showTraffic && cumulativeKwh !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-icon energy">
                <EnergyIcon size={12} />
              </span>
              <span className="tooltip-name">Energy</span>
              <span className="tooltip-value">{cumulativeKwh} kWh</span>
            </div>
          )}

          {!showVoltageCurrentOnly && !showTraffic && pricePerKwh !== undefined && pricePerKwh > 0 && (
            <div className="tooltip-row">
              <span className="tooltip-icon cost">
                <CostIcon size={12} />
              </span>
              <span className="tooltip-name">Rate</span>
              <span className="tooltip-value">${pricePerKwh}/kWh</span>
            </div>
          )}

          {!showVoltageCurrentOnly && !showTraffic && currSoC !== undefined && (
            <div className="tooltip-row">
              <span className="tooltip-icon battery">
                <BatteryIcon size={12} percent={currSoC} />
              </span>
              <span className="tooltip-name">SoC</span>
              <span className="tooltip-value">{currSoC}%</span>
            </div>
          )}

          {/* Voltage/Current chart fields */}
          {!showPowerSocOnly && !showTraffic && avgVoltage !== undefined && avgVoltage > 0 && (
            <div className="tooltip-row">
              <span className="tooltip-icon voltage">
                <VoltageIcon size={12} />
              </span>
              <span className="tooltip-name">Voltage</span>
              <span className="tooltip-value">{avgVoltage.toFixed(1)} V</span>
            </div>
          )}

          {!showPowerSocOnly && !showTraffic && avgCurrent !== undefined && avgCurrent > 0 && (
            <div className="tooltip-row">
              <span className="tooltip-icon current">
                <CurrentIcon size={12} />
              </span>
              <span className="tooltip-name">Current</span>
              <span className="tooltip-value">{avgCurrent.toFixed(1)} A</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
