/**
 * Chart Info Panel Component
 * Displays session details when hovering over chart points
 */

import React, { useState, useEffect, useMemo } from "react";
import { PANEL_PAGE_SIZE } from "../../constants/config";
import { ClockIcon, EnergyIcon, ChartIcon, CarIcon } from "../common/Icons";

// Sort icon component
const SortIcon = ({ direction }) => (
  <svg
    viewBox="0 0 24 24"
    width="8"
    height="8"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    style={{ marginLeft: 2, opacity: direction ? 1 : 0.4 }}
  >
    {direction === "asc" ? (
      <path d="M12 19V5M5 12l7-7 7 7" />
    ) : direction === "desc" ? (
      <path d="M12 5v14M5 12l7 7 7-7" />
    ) : (
      <>
        <path d="M7 10l5-5 5 5" />
        <path d="M7 14l5 5 5-5" />
      </>
    )}
  </svg>
);

const ChartInfoPanel = ({ hoverData, lockedData, onUnlock }) => {
  const [page, setPage] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: "value",
    direction: "asc",
  });

  const data = lockedData ?? hoverData;
  const locked = !!lockedData;

  useEffect(() => {
    setPage(0);
  }, [data?.minute, data?.soc, data?.chartKey, data?.sessions?.length]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
    setPage(0);
  };

  const sortedSessions = useMemo(() => {
    if (!data?.sessions) return [];

    const sessions = [...data.sessions];
    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;

    sessions.sort((a, b) => {
      let aVal, bVal;
      if (key === "endTime") {
        aVal = a.endTime ?? 0;
        bVal = b.endTime ?? 0;
      } else if (key === "duration") {
        aVal = a.totalDuration ?? 0;
        bVal = b.totalDuration ?? 0;
      } else {
        aVal = a.value ?? 0;
        bVal = b.value ?? 0;
      }
      return (aVal - bVal) * multiplier;
    });

    return sessions;
  }, [data?.sessions, sortConfig]);

  if (!data) {
    return (
      <div className="chart-info-panel empty">
        <div className="cip-empty-icon">
          <ChartIcon size={28} />
        </div>
        <p className="cip-empty-title">Session Details</p>
        <p className="cip-empty-hint">Hover chart to see data</p>
      </div>
    );
  }

  const { minute, sessions = [], unit, chartLabel, xAxisKey, dualYAxis } = data;

  const xValue = data[xAxisKey] ?? minute;
  const xLabel =
    xAxisKey === "soc"
      ? `${xValue}% SOC`
      : xAxisKey === "kwh"
        ? `${xValue} kWh`
        : `Min ${xValue}`;

  const totalPages = Math.ceil(sortedSessions.length / PANEL_PAGE_SIZE);
  const paged = sortedSessions.slice(
    page * PANEL_PAGE_SIZE,
    (page + 1) * PANEL_PAGE_SIZE,
  );

  return (
    <div className={`chart-info-panel ${locked ? "locked" : ""}`}>
      <div className="cip-header-compact">
        <div className="cip-header-top">
          <span className="cip-chart-label">{chartLabel}</span>
          {locked && (
            <button
              className="cip-unlock-btn"
              onClick={() => onUnlock?.()}
              title="Click to unlock"
            >
              Unlock
            </button>
          )}
        </div>
        <div className="cip-header-main">
          <span className="cip-minute-large">{xLabel}</span>
          <span className="cip-car-count"><CarIcon size={11} /> {sessions.length}</span>
        </div>
      </div>

      <div className="cip-column-header">
        <span className="cip-col-car">ID</span>
        {xAxisKey !== "soc" && (
          <>
            <button
              className={`cip-col-sort ${sortConfig.key === "duration" ? "active" : ""}`}
              onClick={() => handleSort("duration")}
              title="Sort by duration"
            >
              <ClockIcon size={9} /> Tot
              <SortIcon direction={sortConfig.key === "duration" ? sortConfig.direction : null} />
            </button>
            <button
              className={`cip-col-sort ${sortConfig.key === "endTime" ? "active" : ""}`}
              onClick={() => handleSort("endTime")}
              title="Sort by time"
            >
              <ClockIcon size={9} /> At
              <SortIcon direction={sortConfig.key === "endTime" ? sortConfig.direction : null} />
            </button>
          </>
        )}
        {dualYAxis && (
          <span className="cip-col-kwh">
            <EnergyIcon size={9} /> kWh
          </span>
        )}
        <button
          className={`cip-col-sort cip-col-value ${sortConfig.key === "value" ? "active" : ""}`}
          onClick={() => handleSort("value")}
          title="Sort by value"
        >
          {unit}
          <SortIcon direction={sortConfig.key === "value" ? sortConfig.direction : null} />
        </button>
      </div>

      <div className="cip-sessions-list">
        {paged.map((s, i) => (
          <div
            key={i}
            className={`cip-session-row ${s.stoppedEarly ? "stopped-early" : ""}`}
          >
            <span className="cip-dot" style={{ background: s.color }} />
            <span className="cip-id">
              {s.id}
              {s.stoppedEarly && <span className="cip-stopped-badge" title="Stopped early">⏹</span>}
              {s.isLastBucket && !s.stoppedEarly && <span className="cip-ended-badge" title="Ended">✓</span>}
            </span>
            {xAxisKey !== "soc" && (
              <>
                <span className="cip-duration">{s.totalDurationFormatted || "-"}</span>
                <span className="cip-time" title={s.timeRange || ""}>{s.endTimeFormatted || "-"}</span>
              </>
            )}
            {dualYAxis && (
              <span className="cip-kwh">{s.kwh?.toFixed(2) || "-"}</span>
            )}
            <span className="cip-val">
              {dualYAxis ? `$${s.value?.toFixed(2)}` : s.value?.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="cip-pagination">
          <button
            className="cip-page-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            &lsaquo;
          </button>
          <span className="cip-page-info">{page + 1}/{totalPages}</span>
          <button
            className="cip-page-btn"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            &rsaquo;
          </button>
        </div>
      )}
    </div>
  );
};

export default ChartInfoPanel;
