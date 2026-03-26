/**
 * Stats Dashboard Component
 * Displays statistics and metrics for filtered session data
 */

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  CarIcon,
  EnergyIcon,
  ClockIcon,
  ChargerIcon,
  BatteryIcon,
} from "../common/Icons";

// Custom tooltip for traffic chart
const TrafficTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    return (
      <div className="chart-tooltip">
        <div className="tooltip-header">{label}</div>
        <div className="tooltip-content">
          {payload.map((entry, index) => (
            <div key={index} className="tooltip-row">
              <span
                className="tooltip-icon"
                style={{ color: entry.color }}
              >
                <BatteryIcon size={12} />
              </span>
              <span className="tooltip-name">{entry.name}</span>
              <span className="tooltip-value">{entry.value}</span>
            </div>
          ))}
          <div className="tooltip-row total">
            <span className="tooltip-icon">
              <ChargerIcon size={12} />
            </span>
            <span className="tooltip-name">Total</span>
            <span className="tooltip-value">{total}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const StatsDashboard = ({ stats }) => {
  // Prepare traffic chart data
  const trafficData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: "Winline (160kW)",
        "400V": stats.countMBS1_400V || 0,
        "800V": stats.countMBS1_800V || 0,
      },
      {
        name: "Yotai (180kW)",
        "400V": stats.countMBS2_400V || 0,
        "800V": stats.countMBS2_800V || 0,
      },
    ];
  }, [stats]);

  if (!stats) return null;

  return (
    <div className="stats-dashboard">
      {/* Overview Row */}
      <div className="stats-row">
        {/* Sessions Summary */}
        <div className="stat-card primary">
          <div className="stat-header">
            <span className="stat-icon">
              <CarIcon size={16} />
            </span>
            <span className="stat-label">Sessions</span>
          </div>
          <div className="stat-main-value">{stats.socFilteredCount}</div>
          <div className="stat-sub arch-breakdown">
            <div className="arch-stat">
              <span className="arch-count">{stats.count400V} &times; 400V</span>
              <span className="arch-percent">{stats.ratio400V}%</span>
            </div>
            <div className="arch-stat accent">
              <span className="arch-count">{stats.count800V} &times; 800V</span>
              <span className="arch-percent">{stats.ratio800V}%</span>
            </div>
          </div>
        </div>

        {/* Architecture Performance - Overall */}
        <div className="stat-card wide">
          <div className="stat-header">
            <span className="stat-icon">
              <EnergyIcon size={16} />
            </span>
            <span className="stat-label">
              Full-Session Performance By EV Architecture (Average)
            </span>
          </div>
          <div className="stat-table">
            <div className="stat-table-row header">
              <span></span>
              <span>
                <EnergyIcon size={10} /> Energy
              </span>
              <span>
                <BatteryIcon size={10} /> SOC
              </span>
              <span>
                <EnergyIcon size={10} /> Power
              </span>
            </div>
            <div className="stat-table-row">
              <span className="arch-label">400V</span>
              <span className="value">{stats.avgKwh400V} kWh</span>
              <span className="value">{stats.avgSocGain400V}%</span>
              <span className="value">{stats.avgPower400V} kW</span>
            </div>
            <div className="stat-table-row highlight">
              <span className="arch-label accent">800V</span>
              <span className="value accent">{stats.avgKwh800V} kWh</span>
              <span className="value accent">{stats.avgSocGain800V}%</span>
              <span className="value accent">{stats.avgPower800V} kW</span>
            </div>
          </div>
        </div>

        {/* Architecture Performance - 10-Min */}
        <div className="stat-card wide">
          <div className="stat-header">
            <span className="stat-icon accent">
              <EnergyIcon size={16} />
            </span>
            <span className="stat-label">
              First 10-Minute Performance by Architecture (Average)
            </span>
          </div>
          <div className="stat-table">
            <div className="stat-table-row header">
              <span></span>
              <span>
                <EnergyIcon size={10} /> Energy
              </span>
              <span>
                <BatteryIcon size={10} /> SOC
              </span>
              <span>
                <EnergyIcon size={10} /> Power
              </span>
            </div>
            <div className="stat-table-row">
              <span className="arch-label">400V</span>
              <span className="value">{stats.avgKwh10Min400V} kWh</span>
              <span className="value">{stats.avgSocGain10Min400V}%</span>
              <span className="value">{stats.avgPower10Min400V} kW</span>
            </div>
            <div className="stat-table-row highlight">
              <span className="arch-label accent">800V</span>
              <span className="value accent">{stats.avgKwh10Min800V} kWh</span>
              <span className="value accent">{stats.avgSocGain10Min800V}%</span>
              <span className="value accent">{stats.avgPower10Min800V} kW</span>
            </div>
          </div>
        </div>

        {/* Duration Summary */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">
              <ClockIcon size={16} />
            </span>
            <span className="stat-label">Duration</span>
          </div>
          <div className="duration-summary">
            <div className="duration-row">
              <span className="duration-label">Base Time</span>
              <span className="duration-value">
                {stats.totalBaseDuration} min
              </span>
            </div>
            <div className="duration-row">
              <span className="duration-label">Extensions</span>
              <span className="duration-value accent">
                {stats.totalExtensions}&times; (+{stats.totalExtensionMinutes}{" "}
                min)
              </span>
            </div>
            <div className="duration-row total">
              <span className="duration-label">Total</span>
              <span className="duration-value">
                {stats.totalBaseDuration + stats.totalExtensionMinutes} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Machines Row */}
      <div className="stats-row machines">
        {/* Winline */}
        <div className="stat-card machine">
          <div className="stat-header">
            <div className="machine-name">
              <span className="stat-icon">
                <ChargerIcon size={16} />
              </span>
              <span>Winline</span>
              <span className="power-badge">160kW</span>
            </div>
            <span className="session-count">{stats.countMBS1} sessions</span>
          </div>

          <div className="machine-stats">
            <div className="machine-stat-row">
              <span className="arch-tag">400V</span>
              <span className="stat-value">{stats.avgKwhMBS1_400V} kWh</span>
              <span className="stat-value-secondary">
                {stats.avgPowerMBS1_400V} kW
              </span>
              <span className="session-mini">{stats.countMBS1_400V}</span>
            </div>
            <div className="machine-stat-row">
              <span className="arch-tag accent">800V</span>
              <span className="stat-value accent">
                {stats.avgKwhMBS1_800V} kWh
              </span>
              <span className="stat-value-secondary accent">
                {stats.avgPowerMBS1_800V} kW
              </span>
              <span className="session-mini">{stats.countMBS1_800V}</span>
            </div>
          </div>
        </div>

        {/* Yotai */}
        <div className="stat-card machine">
          <div className="stat-header">
            <div className="machine-name">
              <span className="stat-icon">
                <ChargerIcon size={16} />
              </span>
              <span>Yotai</span>
              <span className="power-badge">180kW</span>
            </div>
            <span className="session-count">{stats.countMBS2} sessions</span>
          </div>
          <div className="machine-stats">
            <div className="machine-stat-row">
              <span className="arch-tag">400V</span>
              <span className="stat-value">{stats.avgKwhMBS2_400V} kWh</span>
              <span className="stat-value-secondary">
                {stats.avgPowerMBS2_400V} kW
              </span>
              <span className="session-mini">{stats.countMBS2_400V}</span>
            </div>
            <div className="machine-stat-row">
              <span className="arch-tag accent">800V</span>
              <span className="stat-value accent">
                {stats.avgKwhMBS2_800V} kWh
              </span>
              <span className="stat-value-secondary accent">
                {stats.avgPowerMBS2_800V} kW
              </span>
              <span className="session-mini">{stats.countMBS2_800V}</span>
            </div>
          </div>
        </div>

        {/* Traffic Chart */}
        <div className="stat-card traffic-chart">
          <div className="stat-header">
            <span className="stat-icon">
              <ChargerIcon size={16} />
            </span>
            <span className="stat-label">Sessions by Charger</span>
          </div>
          <div className="chart-wrapper traffic">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={trafficData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  width={100}
                />
                <Tooltip content={<TrafficTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: "5px" }}
                />
                <Bar
                  dataKey="400V"
                  stackId="a"
                  fill="#64748b"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="800V"
                  stackId="a"
                  fill="#f97316"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
