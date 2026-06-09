/**
 * OPERATIONS INSIGHT Component
 * Provides AI-powered analysis of asset performance
 */

import React from "react";
import { EnergyIcon } from "../common/Icons";

// Refresh icon
const RefreshIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// Trend icons
const TrendUpIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const TrendDownIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

const TrendNeutralIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="15 8 19 12 15 16" />
  </svg>
);

const AIOperationsInsight = ({
  insight,
  loading,
  lastAnalyzed,
  statusPill,
  onRefresh,
}) => {
  // Format time since last analysis
  const formatLastAnalyzed = () => {
    if (!lastAnalyzed) return "Not analyzed";
    const minutes = Math.floor((new Date() - lastAnalyzed) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 min ago";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Get status pill config
  const getStatusConfig = () => {
    switch (statusPill) {
      case "AHEAD":
        return {
          icon: <TrendUpIcon />,
          label: "AHEAD",
          className: "ahead",
        };
      case "LAGGING":
        return {
          icon: <TrendDownIcon />,
          label: "LAGGING",
          className: "lagging",
        };
      default:
        return {
          icon: <TrendNeutralIcon />,
          label: "ON TRACK",
          className: "on-track",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="fi-card ai-insight-card">
      <div className="ai-insight-header">
        <div className="ai-header-left">
          <h3>
            <span className="ai-icon">
              <EnergyIcon size={14} />
            </span>
            OPERATIONS INSIGHT
          </h3>
          <span className="ai-timestamp">
            Last analyzed: {formatLastAnalyzed()}
          </span>
        </div>
        <div className="ai-header-right">
          <button
            className="ai-refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh Analysis"
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
          <div className={`ai-status-pill ${statusConfig.className}`}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      <div className={`ai-insight-content ${loading ? "loading" : ""}`}>
        {loading ? (
          <>
            <div className="ai-section skeleton">
              <div className="skeleton-label" />
              <div className="skeleton-text" />
            </div>
            <div className="ai-section skeleton">
              <div className="skeleton-label" />
              <div className="skeleton-text" />
              <div className="skeleton-text short" />
            </div>
            <div className="ai-section skeleton">
              <div className="skeleton-label" />
              <div className="skeleton-text" />
            </div>
          </>
        ) : insight ? (
          <>
            <div className="ai-section trend">
              <span className="ai-section-label">Trend Signal</span>
              <p className="ai-section-text">{insight.trend_signal}</p>
            </div>
            <div className="ai-section-divider" />
            <div className="ai-section dragging">
              <span className="ai-section-label">What's Dragging It</span>
              <p className="ai-section-text">{insight.dragging_factor}</p>
            </div>
            <div className="ai-section-divider" />
            <div className="ai-section action">
              <span className="ai-section-label">Recommended Action</span>
              <p className="ai-section-text highlight">
                {insight.recommended_action}
              </p>
            </div>
          </>
        ) : (
          <div className="ai-empty">
            <p>Click refresh to generate analysis</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIOperationsInsight;
