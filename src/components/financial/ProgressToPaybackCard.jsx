/**
 * Progress to Payback Card Component
 * Shows payback progress with cumulative cash flow
 */

import React from "react";
import { EBE_MODEL } from "../../constants/ebeModel";
import { CostIcon, ClockIcon } from "../common/Icons";

const ProgressToPaybackCard = ({ waterfallData, irrData, loading }) => {
  if (loading || !waterfallData) {
    return (
      <div className="fi-card progress-payback-card">
        <div className="fi-card-header">
          <h3>Progress to Payback</h3>
        </div>
        <div className="payback-loading">
          <div className="skeleton-bar" />
          <div className="skeleton-stats" />
        </div>
      </div>
    );
  }

  const {
    cumulativeCashFlow,
    remainingToPayback,
    netCapex,
    paybackProgress,
  } = waterfallData;

  const paybackPeriod = irrData?.paybackPeriod || EBE_MODEL.targets.paybackYears;

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format payback period
  const formatPayback = (years) => {
    if (years >= 20) return ">20 years";
    const y = Math.floor(years);
    const m = Math.round((years - y) * 12);
    if (m === 0) return `${y} years`;
    return `${y}y ${m}m`;
  };

  return (
    <div className="fi-card progress-payback-card">
      <div className="fi-card-header">
        <h3>Progress to Payback</h3>
      </div>

      <div className="payback-content">
        {/* Main Progress Bar */}
        <div className="payback-progress-main">
          <div className="payback-bar-container">
            <div className="payback-bar-track">
              <div
                className="payback-bar-fill"
                style={{ width: `${Math.min(100, paybackProgress)}%` }}
              />
              <div className="payback-bar-marker" style={{ left: "100%" }}>
                <span className="marker-label">Target</span>
              </div>
            </div>
            <div className="payback-bar-labels">
              <span className="bar-start">$0</span>
              <span className="bar-current">
                {formatCurrency(netCapex - remainingToPayback)}
              </span>
              <span className="bar-end">{formatCurrency(netCapex)}</span>
            </div>
          </div>
          <div className="payback-percentage">
            <span className="percentage-value">{paybackProgress.toFixed(1)}%</span>
            <span className="percentage-label">Complete</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="payback-stats-grid">
          <div className="payback-stat">
            <div className="stat-icon">
              <CostIcon size={14} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Cumulative Cash Flow to Date</span>
              <span className={`stat-value ${cumulativeCashFlow >= 0 ? "positive" : "negative"}`}>
                {formatCurrency(cumulativeCashFlow)}
              </span>
            </div>
          </div>

          <div className="payback-stat">
            <div className="stat-icon">
              <CostIcon size={14} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Remaining to Payback</span>
              <span className="stat-value">
                {formatCurrency(remainingToPayback)}
              </span>
            </div>
          </div>

          <div className="payback-stat">
            <div className="stat-icon">
              <CostIcon size={14} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Net Capex (After Incentives)</span>
              <span className="stat-value">
                {formatCurrency(netCapex)}
              </span>
            </div>
          </div>

          <div className="payback-stat">
            <div className="stat-icon">
              <ClockIcon size={14} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Projected Payback Period</span>
              <span className="stat-value">
                {formatPayback(paybackPeriod)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressToPaybackCard;
