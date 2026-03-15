/**
 * Session Card Component
 * Displays a summary of a charging session
 */

import React from "react";

const SessionCard = ({ session, isSelected, onClick }) => (
  <div
    className={`session-card ${isSelected ? "selected" : ""}`}
    onClick={onClick}
  >
    <div className="session-card-header">
      <div className="session-id-badge">
        <span className="session-id">{session.session_id}</span>
        <span className={`status-pill ${session.status}`}>
          {session.status}
        </span>
      </div>
      <span className="session-time">
        {new Date(session.start_time).toLocaleDateString()}
      </span>
    </div>

    <div className="session-metrics">
      <div className="metric">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <div>
          <span className="metric-value">{session.total_kwh.toFixed(1)}</span>
          <span className="metric-unit">kWh</span>
        </div>
      </div>
      <div className="metric">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <div>
          <span className="metric-value">{session.duration_minutes}</span>
          <span className="metric-unit">min</span>
        </div>
      </div>
      <div className="metric">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M22 11h2v4h-2" />
          <path d="M6 11v4" />
        </svg>
        <div>
          <span className="metric-value">
            {session.soc_start}&rarr;{session.soc_end}
          </span>
          <span className="metric-unit">%</span>
        </div>
      </div>
    </div>

    {/* 10-min stats row */}
    <div className="session-10min-stats">
      <div className="stat-10min">
        <span className="stat-10min-label">10min kWh</span>
        <span className="stat-10min-value">
          {(session.kwh_10_min || 0).toFixed(2)}
        </span>
      </div>
      <div className="stat-10min">
        <span className="stat-10min-label">10min SOC</span>
        <span className="stat-10min-value">
          +{(session.soc_10_min_gain || 0).toFixed(0)}%
        </span>
      </div>
    </div>

    <div className="session-card-footer">
      <span
        className={`voltage-badge ${session.voltage_arch === "800V" ? "v800" : "v400"}`}
      >
        {session.voltage_arch || "400V"}
      </span>
      <span className="machine-badge">{session.machine_type}</span>
      <span className="connector-badge">{session.connector_type}</span>
      {session.buckets && session.buckets.length > 0 && (
        <span className="chart-badge">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="12"
            height="12"
          >
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
          </svg>
          Chart
        </span>
      )}
    </div>
  </div>
);

export default SessionCard;
