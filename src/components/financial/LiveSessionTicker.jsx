/**
 * Live Session Ticker Component
 * Shows real-time charger status and revenue generation
 */

import React, { useState, useEffect } from "react";
import { ChargerIcon, EnergyIcon, ClockIcon, CostIcon } from "../common/Icons";

const LiveSessionTicker = ({ liveData, loading }) => {
  const [tickerTime, setTickerTime] = useState(new Date());

  // Update ticker every second for live clock
  useEffect(() => {
    const interval = setInterval(() => setTickerTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Format elapsed time
  const formatElapsed = (startTime) => {
    if (!startTime) return "00:00";
    const elapsed = Math.floor((tickerTime - new Date(startTime)) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="fi-card live-ticker-card">
        <div className="fi-card-header">
          <h3>Live Session Activity</h3>
          <span className="fi-badge loading">Loading...</span>
        </div>
        <div className="ticker-loading">
          <div className="skeleton-charger" />
          <div className="skeleton-charger" />
        </div>
      </div>
    );
  }

  const { chargers, todayRevenue, todaySessions, todayKwh, activeCount } = liveData;

  return (
    <div className="fi-card live-ticker-card">
      <div className="fi-card-header">
        <div className="ticker-header-left">
          <h3>Live Session Activity</h3>
          <span className="ticker-status">
            {activeCount} of {chargers.length} chargers active
          </span>
        </div>
        <div className="ticker-today">
          <span className="today-label">Today so far</span>
          <span className="today-value">{formatCurrency(todayRevenue)}</span>
        </div>
      </div>

      <div className="charger-grid">
        {chargers.map((charger) => (
          <div
            key={charger.id}
            className={`charger-card ${charger.status.toLowerCase()}`}
          >
            <div className="charger-header">
              <div className="charger-name">
                <span className="charger-icon">
                  <ChargerIcon size={16} />
                </span>
                <span>{charger.name}</span>
                <span className="charger-power">{charger.powerKw}kW</span>
              </div>
              <span className={`charger-status-badge ${charger.status.toLowerCase()}`}>
                {charger.isActive && <span className="pulse-dot" />}
                {charger.status}
              </span>
            </div>

            {charger.isActive ? (
              <div className="charger-active-stats">
                <div className="active-stat">
                  <span className="stat-icon">
                    <EnergyIcon size={12} />
                  </span>
                  <span className="stat-value">
                    {charger.currentKwh.toFixed(1)} kWh
                  </span>
                </div>
                <div className="active-stat">
                  <span className="stat-icon">
                    <ClockIcon size={12} />
                  </span>
                  <span className="stat-value elapsed">
                    {formatElapsed(charger.sessionStartTime)}
                  </span>
                </div>
                <div className="active-stat revenue">
                  <span className="stat-icon">
                    <CostIcon size={12} />
                  </span>
                  <span className="stat-value">
                    {formatCurrency(charger.sessionRevenue)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="charger-idle">
                <span className="idle-message">Ready for next session</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="ticker-footer">
        <div className="footer-stat">
          <span className="footer-label">Sessions Today</span>
          <span className="footer-value">{todaySessions}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">Energy Dispensed</span>
          <span className="footer-value">{todayKwh.toFixed(1)} kWh</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">Last Updated</span>
          <span className="footer-value muted">
            {liveData.lastUpdated?.toLocaleTimeString() || "--:--"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveSessionTicker;
