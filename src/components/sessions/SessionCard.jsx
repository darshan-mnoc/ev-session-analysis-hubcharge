/**
 * Session Card Component
 * Displays a summary of a charging session
 */

import React from "react";
import {
  EnergyIcon,
  ClockIcon,
  BatteryIcon,
  ChartIcon,
} from "../common/Icons";
import { normalizeMachineType, detectVehicleType } from "../../utils/helpers";

// Tesla logo icon
const TeslaIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C11.24 0 3.28.44 1.68 1.12l.84 2.16c1.12-.48 3.08-.84 4.08-.84-.88 1.4-2.36 5.28-2.36 7.68 0 2.08 1.76 13.88 7.76 13.88s7.76-11.8 7.76-13.88c0-2.4-1.48-6.28-2.36-7.68 1 0 2.96.36 4.08.84l.84-2.16C20.72.44 12.76 0 12 0zm0 2.64c.68 0 2.92.12 4.24.36-.4.64-.92 1.56-1.36 2.48-.8-.08-1.84-.16-2.88-.16s-2.08.08-2.88.16c-.44-.92-.96-1.84-1.36-2.48 1.32-.24 3.56-.36 4.24-.36zm0 4.24c1.2 0 2.4.12 3.24.28-.56 1.16-1.08 2.6-1.4 3.92-.6-.08-1.2-.12-1.84-.12s-1.24.04-1.84.12c-.32-1.32-.84-2.76-1.4-3.92.84-.16 2.04-.28 3.24-.28zm0 5.56c.6 0 1.2.04 1.72.12.08.68.2 1.52.36 2.44.2 1.2.44 2.52.68 3.72-1 .52-1.84.8-2.76.8s-1.76-.28-2.76-.8c.24-1.2.48-2.52.68-3.72.16-.92.28-1.76.36-2.44.52-.08 1.12-.12 1.72-.12z"/>
  </svg>
);

// Generic EV icon
const EvIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
    <path d="M17 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
    <path d="M5 9l2-4h6l4 4H5z"/>
    <path d="M5 9h14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9z"/>
    <path d="M14 5l1-2h2l1 2"/>
  </svg>
);

const SessionCard = ({ session, isSelected, onClick }) => {
  // Detect vehicle type from session note
  const vehicleInfo = detectVehicleType(session.session_note, session.connector_type);

  return (
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
          <span className="metric-icon energy">
            <EnergyIcon size={14} />
          </span>
          <div>
            <span className="metric-value">{session.total_kwh.toFixed(1)}</span>
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

      {/* 10-min stats row */}
      <div className="session-10min-stats">
        <div className="stat-10min-item">
          <EnergyIcon size={10} color="#f97316" />
          <span className="stat-10min-value">{(session.kwh_10_min || 0).toFixed(1)}</span>
          <span className="stat-10min-unit">kWh</span>
          <span className="stat-10min-label">10 Min</span>
        </div>
        <div className="stat-10min-item">
          <BatteryIcon size={10} color="#f97316" />
          <span className="stat-10min-value">+{(session.soc_10_min_gain || 0).toFixed(0)}</span>
          <span className="stat-10min-unit">%</span>
          <span className="stat-10min-label">10 Min</span>
        </div>
      </div>

      <div className="session-card-footer">
        {/* Vehicle Type Badge */}
        {vehicleInfo.vehicleType !== "Unknown" && (
          <span className={`vehicle-badge ${vehicleInfo.isTesla ? "tesla" : "other-ev"}`}>
            {vehicleInfo.isTesla ? <TeslaIcon size={10} /> : <EvIcon size={10} />}
            <span>{vehicleInfo.vehicleType}</span>
          </span>
        )}
        <span
          className={`voltage-badge ${session.voltage_arch === "800V" ? "v800" : "v400"}`}
        >
          {session.voltage_arch || "400V"}
        </span>
        <span className="machine-badge">{normalizeMachineType(session.machine_type)}</span>
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
