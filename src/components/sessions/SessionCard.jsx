/**
 * Session Card Component
 */

import React from "react";
import { normalizeMachineType, detectVehicleType } from "../../utils/helpers";
import {
  EnergyIcon,
  ClockIcon,
  BatteryIcon,
  ChartIcon,
} from "../common/Icons";

const SessionCard = ({ session, isSelected, onClick }) => {
  const vehicleInfo = detectVehicleType(
    session.session_note,
    session.connector_type,
  );

  return (
    <div
      className={`session-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      {/* Header */}
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

      {/* Primary metrics */}
      <div className="session-metrics">
        <div className="metric">
          <span className="metric-icon energy">
            <EnergyIcon size={14} />
          </span>
          <div>
            <span className="metric-value">{(session.total_kwh || 0).toFixed(1)}</span>
            <span className="metric-unit">kWh</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon time">
            <ClockIcon size={14} />
          </span>
          <div>
            <span className="metric-value">{session.duration_minutes}</span>
            <span className="metric-unit">min</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon battery">
            <BatteryIcon size={14} percent={session.soc_end} />
          </span>
          <div>
            <span className="metric-value">
              {session.soc_start}&rarr;{session.soc_end}
            </span>
            <span className="metric-unit">%</span>
          </div>
        </div>
      </div>

      {/* 10-min stats */}
      <div className="session-10min-stats">
        <div className="stat-10min-item">
          <EnergyIcon size={10} color="#94a1ad" />
          <span className="stat-10min-value">
            {(session.kwh_10_min || 0).toFixed(1)}
          </span>
          <span className="stat-10min-unit">kWh</span>
          <span className="stat-10min-label">10 Min</span>
        </div>
        <div className="stat-10min-item">
          <BatteryIcon size={10} color="#94a1ad" />
          <span className="stat-10min-value">
            +{(session.soc_10_min_gain || 0).toFixed(0)}
          </span>
          <span className="stat-10min-unit">%</span>
          <span className="stat-10min-label">10 Min</span>
        </div>
      </div>

      {/* Footer tags */}
      <div className="session-card-footer">
        {vehicleInfo.vehicleType !== "Unknown" && (
          <span className="vehicle-badge other-ev">
            <span>{vehicleInfo.vehicleType}</span>
          </span>
        )}
        <span
          className={`voltage-badge ${session.voltage_arch === "800V" ? "v800" : "v400"}`}
        >
          {session.voltage_arch || "400V"}
        </span>
        <span className="machine-badge">
          {normalizeMachineType(session.machine_type)}
        </span>
        <span className="connector-badge">{session.connector_type}</span>
        {session.buckets && session.buckets.length > 0 && (
          <span className="chart-badge">
            <ChartIcon size={10} />
          </span>
        )}
      </div>
    </div>
  );
};

export default SessionCard;
