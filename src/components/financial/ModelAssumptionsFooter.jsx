/**
 * Model Assumptions Footer Component
 * Simplified panel showing eBe model parameters
 */

import React, { useState } from "react";
import {
  EBE_MODEL,
  PRICING,
  MODEL_VERSION,
  MODEL_EFFECTIVE_DATE,
} from "../../constants/ebeModel";
import { EnergyIcon, CostIcon, ClockIcon, ChargerIcon, BatteryIcon } from "../common/Icons";

// Chevron icon
const ChevronIcon = ({ expanded }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s ease",
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Section component with note support
const AssumptionSection = ({ title, icon, note, children }) => (
  <div className="assumption-section">
    <h4 className="assumption-section-title">
      <span className="section-icon">{icon}</span>
      {title}
    </h4>
    {note && <p className="section-note">{note}</p>}
    <div className="assumption-grid">{children}</div>
  </div>
);

// Item component with optional note
const AssumptionItem = ({ label, value, note, highlight }) => (
  <div className={`assumption-item ${highlight ? "highlight" : ""}`}>
    <div className="assumption-main">
      <span className="assumption-label">{label}</span>
      <span className="assumption-value">{value}</span>
    </div>
    {note && <span className="assumption-note">{note}</span>}
  </div>
);

const ModelAssumptionsFooter = () => {
  const [expanded, setExpanded] = useState(false);

  const { system, capex, incentives, evCharging, utilization, rechargeCosts, opex, battery, targets, cashFlowMilestones } = EBE_MODEL;

  // Format helpers
  const formatCurrency = (value, showCents = false) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    }).format(value);

  const formatPercent = (value, decimals = 0) =>
    `${(value * 100).toFixed(decimals)}%`;

  return (
    <div className="fi-card model-assumptions-card">
      <button
        className="assumptions-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="toggle-left">
          <span className="toggle-icon">
            <EnergyIcon size={14} />
          </span>
          <span className="toggle-title">Model Assumptions</span>
          <span className="toggle-subtitle">
            {expanded ? "Click to collapse" : "View all model parameters"}
          </span>
        </div>
        <div className="toggle-right">
          <span className="model-version">eBe {MODEL_VERSION}</span>
          <span className="model-date">{MODEL_EFFECTIVE_DATE}</span>
          <ChevronIcon expanded={expanded} />
        </div>
      </button>

      {expanded && (
        <div className="assumptions-content">
          {/* Key Metrics Summary */}
          <div className="key-metrics-banner">
            <div className="key-metric">
              <span className="km-value">{targets.baselineIRR}%</span>
              <span className="km-label">20-Year IRR</span>
            </div>
            <div className="key-metric">
              <span className="km-value">{targets.paybackYears.toFixed(1)} yrs</span>
              <span className="km-label">Payback Period</span>
            </div>
            <div className="key-metric">
              <span className="km-value">{formatCurrency(capex.totalSystemCapex)}</span>
              <span className="km-label">Gross Capex</span>
            </div>
            <div className="key-metric accent">
              <span className="km-value">{formatCurrency(incentives.netEffectiveCapex)}</span>
              <span className="km-label">Net After Incentives</span>
            </div>
          </div>

          {/* Main Grid */}
          <div className="assumptions-columns">
            {/* System & Capex */}
            <AssumptionSection
              title="System & Capex"
              icon={<ChargerIcon size={12} />}
              note={capex.note}
            >
              <AssumptionItem
                label="CVP EV Systems"
                value={system.cvpEvSystems}
              />
              <AssumptionItem
                label="DCFC Chargers"
                value={`${system.dcfcChargers} units`}
              />
              <AssumptionItem
                label="Battery Storage"
                value={`${system.bscsStorageCapacityKwh} kWh`}
              />
              <AssumptionItem
                label="Power Capacity"
                value={`${system.bscsOperatingCapacityKw} kW`}
              />
              <AssumptionItem
                label="System Capex"
                value={formatCurrency(capex.totalSystemCapex)}
                highlight
              />
              <AssumptionItem
                label="Battery Replacement"
                value={formatCurrency(capex.batteryReplacementCost)}
                note={`Every ${capex.batteryReplacementInterval} years`}
              />
              <AssumptionItem
                label="Round-Trip Efficiency"
                value={formatPercent(system.systemRte)}
                note="Discharge-side loss included"
              />
            </AssumptionSection>

            {/* Incentives */}
            <AssumptionSection
              title="Federal & State Incentives"
              icon={<CostIcon size={12} />}
              note={incentives.note}
            >
              <AssumptionItem
                label="Federal ITC"
                value={formatPercent(incentives.federalITC)}
                note={`Direct pay: ${formatCurrency(incentives.federalITCAmount)}`}
              />
              <AssumptionItem
                label="Bonus MACRS"
                value={formatPercent(incentives.bonusMACRS)}
                note={`Year 1 cash: ${formatCurrency(incentives.macrsYear1CashValue)}`}
              />
              <AssumptionItem
                label="Federal Tax Rate"
                value={formatPercent(incentives.federalTaxRate)}
              />
              <AssumptionItem
                label="State Tax Rate"
                value={formatPercent(incentives.stateTaxRate, 2)}
                note="California"
              />
              <AssumptionItem
                label="Net Effective Capex"
                value={`~${formatCurrency(incentives.netEffectiveCapex)}`}
                highlight
                note="After all incentives"
              />
            </AssumptionSection>

            {/* Revenue Model */}
            <AssumptionSection
              title="EV Charging Revenue"
              icon={<EnergyIcon size={12} />}
              note={evCharging.note}
            >
              <AssumptionItem
                label="Blended EV Rate"
                value={`${formatCurrency(evCharging.blendedEvRate, true)}/kWh`}
                highlight
              />
              <AssumptionItem
                label="Energy per Session"
                value={`${evCharging.energyPerSession} kWh`}
                note="Average delivery"
              />
              <AssumptionItem
                label="Base Session"
                value={`${formatCurrency(PRICING.baseSession.price)} / ${PRICING.baseSession.duration} min`}
              />
              <AssumptionItem
                label="Extension Price"
                value={`${formatCurrency(PRICING.extensions.currentPrice, true)} / 5 min`}
                note={`Optimized: ${formatCurrency(PRICING.extensions.optimizedPrice, true)}`}
              />
              <AssumptionItem
                label="Annual Rate Inflation"
                value={formatPercent(evCharging.rateInflationYears1to5)}
                note="Years 1-20"
              />
            </AssumptionSection>

            {/* Utilization */}
            <AssumptionSection
              title="Utilization Projections"
              icon={<ClockIcon size={12} />}
              note={utilization.note}
            >
              <AssumptionItem
                label="Daily Discharge (Yr 1-5)"
                value={`${utilization.dailyDischargeYear1to5} kWh`}
                note={`~${utilization.sessionsPerDayYear1to5} sessions/day`}
              />
              <AssumptionItem
                label="Daily Discharge (Yr 6+)"
                value={`${utilization.dailyDischargeYear6to20} kWh`}
                note={`~${utilization.sessionsPerDayYear6to20} sessions/day`}
                highlight
              />
              <AssumptionItem
                label="Max Daily Capacity"
                value={`${utilization.dailyContinuousMaxDischarge} kWh`}
                note={`${utilization.maxSessionsPerDay} sessions ceiling`}
              />
            </AssumptionSection>

            {/* Recharge Costs */}
            <AssumptionSection
              title="Grid Electricity (Recharge)"
              icon={<EnergyIcon size={12} />}
              note={rechargeCosts.note}
            >
              <AssumptionItem
                label="Tariff"
                value={rechargeCosts.tariff}
              />
              <AssumptionItem
                label="Peak Rate"
                value={`${formatCurrency(rechargeCosts.peakBlended, true)}/kWh`}
              />
              <AssumptionItem
                label="Non-Peak Rate"
                value={`${formatCurrency(rechargeCosts.nonPeakBlended, true)}/kWh`}
                highlight
                note="Charging window"
              />
              <AssumptionItem
                label="Blended Average"
                value={`${formatCurrency(rechargeCosts.totalBlended, true)}/kWh`}
              />
              <AssumptionItem
                label="Tariff Inflation"
                value={`${formatPercent(rechargeCosts.inflationYears1to5)}/yr`}
              />
            </AssumptionSection>

            {/* O&M */}
            <AssumptionSection
              title="Operating Expenses"
              icon={<CostIcon size={12} />}
              note={opex.note}
            >
              <AssumptionItem
                label="Host Profit Share"
                value={formatPercent(opex.hostProfitShare)}
                note="Revenue share to site"
              />
              <AssumptionItem
                label="NOC License Fee"
                value={`${formatPercent(opex.nocLicenseFee)} of Host`}
                note="Network operations"
              />
              <AssumptionItem
                label="BSCS Maintenance"
                value={`${formatCurrency(opex.bscsMaintenancePerKw)}/kW-yr`}
              />
              <AssumptionItem
                label="DCFC Maintenance"
                value={`${formatCurrency(opex.dcfcMaintenancePerCharger)}/charger-yr`}
              />
              <AssumptionItem
                label="Battery Service"
                value={`${formatCurrency(opex.annualBatteryMaintenance)}/yr`}
              />
              <AssumptionItem
                label="Total Base O&M"
                value={`${formatCurrency(opex.totalAnnualMaintenance)}/yr`}
                highlight
                note={`+${formatPercent(opex.maintenanceInflation)} inflation`}
              />
            </AssumptionSection>

            {/* Battery */}
            <AssumptionSection
              title="Battery Performance"
              icon={<BatteryIcon size={12} />}
              note={battery.note}
            >
              <AssumptionItem
                label="Annual Degradation"
                value={formatPercent(battery.annualDegradation)}
              />
              <AssumptionItem
                label="Year 1 Capacity"
                value={formatPercent(battery.year1Capacity)}
              />
              <AssumptionItem
                label="Year 5 Capacity"
                value={formatPercent(battery.year5Capacity)}
                note="Before replacement"
              />
              <AssumptionItem
                label="Replacement Cycle"
                value={`${capex.batteryReplacementInterval} years`}
                note="Restores full capacity"
              />
            </AssumptionSection>

            {/* Cash Flow Milestones */}
            <AssumptionSection
              title="Projected Cash Flow"
              icon={<CostIcon size={12} />}
              note={cashFlowMilestones.note}
            >
              <AssumptionItem
                label="Year 1 Revenue"
                value={formatCurrency(cashFlowMilestones.year1Revenue)}
              />
              <AssumptionItem
                label="Year 5 Revenue"
                value={formatCurrency(cashFlowMilestones.year5Revenue)}
                note="End of ramp-up"
              />
              <AssumptionItem
                label="Year 6 Revenue"
                value={formatCurrency(cashFlowMilestones.year6Revenue)}
                highlight
                note="Mature operations begin"
              />
              <AssumptionItem
                label="Year 20 Revenue"
                value={formatCurrency(cashFlowMilestones.year20Revenue)}
              />
            </AssumptionSection>
          </div>

          {/* Footer */}
          <div className="model-footer">
            <span className="model-version-tag">
              Energy Balancing Engine (eBe) Model {MODEL_VERSION}
            </span>
            <span className="model-confidential">
              CONFIDENTIAL — For Authorized Investor Use Only
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelAssumptionsFooter;
