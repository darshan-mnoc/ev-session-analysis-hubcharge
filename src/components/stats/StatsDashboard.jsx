/**
 * Stats Dashboard Component
 * Displays statistics and metrics for filtered session data
 */

import React from "react";

const StatsDashboard = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="stats-dashboard">
      {/* Overview Row */}
      <div className="stats-row">
        {/* Sessions Summary */}
        <div className="stat-card primary">
          <div className="stat-header">
            <span className="stat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </span>
            <span className="stat-label">
              Performance by EV's Battery Architecture (Overall)
            </span>
          </div>
          <div className="stat-table">
            <div className="stat-table-row header">
              <span></span>
              <span>Avg Energy</span>
              <span>Avg SOC Gain</span>
              <span>Avg Power</span>
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
            <span className="stat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </span>
            <span className="stat-label">
              Performance by EV's Battery Architecture (10-Min Overall)
            </span>
          </div>
          <div className="stat-table">
            <div className="stat-table-row header">
              <span></span>
              <span>Avg Energy</span>
              <span>Avg SOC Gain</span>
              <span>Avg Power</span>
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
              <span className="value accent">{stats.avgPower800V} kW</span>
            </div>
          </div>
        </div>

        {/* Duration Summary */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
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
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
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
              <span className="session-mini">{stats.countMBS1_400V}</span>
            </div>
            <div className="machine-stat-row">
              <span className="arch-tag accent">800V</span>
              <span className="stat-value accent">
                {stats.avgKwhMBS1_800V} kWh
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
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
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
              <span className="session-mini">{stats.countMBS2_400V}</span>
            </div>
            <div className="machine-stat-row">
              <span className="arch-tag accent">800V</span>
              <span className="stat-value accent">
                {stats.avgKwhMBS2_800V} kWh
              </span>
              <span className="session-mini">{stats.countMBS2_800V}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
