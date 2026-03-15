/**
 * Session Details Component
 * Displays detailed information and charts for a selected session
 */

import React, { useMemo } from "react";
import { TIME_RANGE_OPTIONS } from "../../constants/config";
import { ChartCard } from "../charts";

const SessionDetails = ({
  session,
  chartTimeRange,
  onTimeRangeChange,
  onClose,
}) => {
  // Chart data for selected session
  const chartData = useMemo(() => {
    if (!session) return [];

    const allData =
      session.buckets && session.buckets.length > 0 ? session.buckets : [];

    // Apply time range filter
    let filteredBuckets = allData;
    if (chartTimeRange !== "full" && allData.length > 0) {
      filteredBuckets = allData.slice(0, chartTimeRange);
    }

    // Add cumulative kWh to each bucket
    let cumulativeKwh = 0;
    return filteredBuckets.map((bucket, index) => {
      const minuteKwh = (bucket.avgPowerKw || 0) * (1 / 60);
      cumulativeKwh += minuteKwh;
      return {
        ...bucket,
        minuteKwh: +minuteKwh.toFixed(3),
        cumulativeKwh: +cumulativeKwh.toFixed(2),
      };
    });
  }, [session, chartTimeRange]);

  if (!session) {
    return (
      <div className="chart-placeholder">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 3v18h18" />
          <path d="M18 9l-5 5-4-4-3 3" />
        </svg>
        <h3>Select a Session</h3>
        <p>
          Click on any session card to view detailed analytics and charging
          curves
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="chart-header">
        <div>
          <h2>Session Details</h2>
          <p className="chart-subtitle">{session.full_id}</p>
        </div>
        <button className="close-btn" onClick={onClose}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Full Session Details */}
      <div className="session-detail-grid full">
        <div className="detail-item">
          <span className="detail-label">User</span>
          <span className="detail-value">{session.participant_label}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Site</span>
          <span className="detail-value">{session.ems_site}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Machine Type</span>
          <span className="detail-value">{session.machine_type}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Connector Type</span>
          <span className="detail-value">{session.connector_type}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Start Time</span>
          <span className="detail-value">
            {new Date(session.start_time).toLocaleString()}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">End Time</span>
          <span className="detail-value">
            {session.end_time
              ? new Date(session.end_time).toLocaleString()
              : "N/A"}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Duration</span>
          <span className="detail-value highlight">
            {session.duration_minutes} min
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Extensions</span>
          <span className="detail-value">
            {session.extension_count || 0}&times; (+
            {session.extension_minutes || 0} min)
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Status</span>
          <span className="detail-value">{session.status}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">SOC Start</span>
          <span className="detail-value">{session.soc_start}%</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">SOC End</span>
          <span className="detail-value">{session.soc_end}%</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">SOC Gain</span>
          <span className="detail-value highlight">{session.soc_gain}%</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Total Energy</span>
          <span className="detail-value highlight">
            {session.total_kwh.toFixed(2)} kWh
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Avg Power</span>
          <span className="detail-value">
            {session.average_kw.toFixed(2)} kW
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Cost</span>
          <span className="detail-value highlight">
            ${session.final_cost.toFixed(2)}
          </span>
        </div>
      </div>

      {/* First 10 Min Inline */}
      <div className="detail-highlight-row">
        <div className="detail-highlight">
          <span className="dh-label">Architecture</span>
          <span
            className={`dh-value ${session.voltage_arch === "800V" ? "accent" : ""}`}
          >
            {session.voltage_arch || "400V"}
          </span>
        </div>
        <div className="detail-highlight">
          <span className="dh-label">10-Min Energy</span>
          <span className="dh-value accent">
            {(session.kwh_10_min || 0).toFixed(2)} kWh
          </span>
        </div>
        <div className="detail-highlight">
          <span className="dh-label">10-Min Power</span>
          <span className="dh-value accent">
            {(session.kw_10_min || 0).toFixed(2)} kW
          </span>
        </div>
        <div className="detail-highlight">
          <span className="dh-label">10-Min SOC</span>
          <span className="dh-value">
            +{(session.soc_10_min_gain || 0).toFixed(0)}%
          </span>
        </div>
        <div className="detail-highlight">
          <span className="dh-label">Avg Voltage</span>
          <span className="dh-value">
            {(session.avg_voltage || 0).toFixed(0)}V
          </span>
        </div>
        <div className="detail-highlight">
          <span className="dh-label">Avg Current</span>
          <span className="dh-value">
            {(session.avg_current || 0).toFixed(1)}A
          </span>
        </div>
      </div>

      <div className="detail-highlight-row">
        <div className="detail-item">
          <span className="detail-label">Session Note</span>
          <span className="detail-value">{session.session_note}</span>
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="time-range-filter">
        <label>Chart Time Range:</label>
        <div className="time-range-buttons">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`time-btn ${chartTimeRange === option.value ? "active" : ""}`}
              onClick={() => onTimeRangeChange(option.value)}
              disabled={
                typeof option.value === "number" &&
                option.value > session.duration_minutes
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="charts-container">
        <ChartCard
          title="Power & State of Charge"
          data={chartData}
          dataKey="avgPowerKw"
          color="#f97316"
          unit="kW"
          secondaryDataKey="socPercent"
          secondaryColor="#52525b"
          secondaryUnit="%"
        />

        <ChartCard
          title="Voltage & Current"
          data={chartData}
          dataKey="avgVoltageV"
          color="#52525b"
          unit="V"
          secondaryDataKey="avgCurrentA"
          secondaryColor="#f97316"
          secondaryUnit="A"
        />
      </div>
    </>
  );
};

export default SessionDetails;
