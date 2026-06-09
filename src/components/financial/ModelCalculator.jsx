/**
 * Interactive eBe Model Calculator Component
 * Design matches Excel Parameters sheet layout
 */

import React, { useState } from 'react';
import { useEbeCalculator, PARAM_DEFINITIONS, DEFAULT_PARAMS } from '../../hooks/useEbeCalculator';
import './ModelCalculator.css';

// Format helpers
const formatCurrency = (value, decimals = 0) => {
  if (value === undefined || value === null || isNaN(value)) return '$0';
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000000) return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
  if (absValue >= 1000) return `${sign}$${(absValue / 1000).toFixed(decimals > 0 ? 1 : 0)}K`;
  return `${sign}$${absValue.toFixed(decimals)}`;
};

const formatNumber = (value, decimals = 0) => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return value.toFixed(decimals);
};

// Icons
const ResetIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// Parameter Row Component (matches Excel table style)
const ParamRow = ({ label, value, unit, auxValue, onChange, paramKey, isModified, min, max, step }) => (
  <div className={`param-row ${isModified ? 'modified' : ''}`}>
    <div className="param-name">{label}</div>
    <div className="param-value-cell">
      {onChange ? (
        <div className="param-input-group">
          {unit === '$' && <span className="input-prefix">$</span>}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(paramKey, parseFloat(e.target.value) || 0)}
            min={min}
            max={max}
            step={step}
            className="param-input"
          />
          {unit && unit !== '$' && <span className="input-suffix">{unit}</span>}
        </div>
      ) : (
        <span className="param-display">
          {unit === '$' ? formatCurrency(value) : `${formatNumber(value, 1)} ${unit || ''}`}
        </span>
      )}
    </div>
    <div className="param-aux">{auxValue || ''}</div>
  </div>
);

// Section Header Component
const SectionHeader = ({ title }) => (
  <div className="section-header-row">
    <span className="section-title">{title}</span>
  </div>
);

// Computed Row Component (read-only display)
const ComputedRow = ({ label, value, unit, auxValue }) => (
  <div className="param-row computed">
    <div className="param-name">{label}</div>
    <div className="param-value-cell">
      <span className="computed-value">
        {typeof value === 'number' ? `${formatNumber(value, 1)} ${unit || ''}` : value}
      </span>
    </div>
    <div className="param-aux">{auxValue || ''}</div>
  </div>
);

// Load Row Component - matches Excel structure: Name | Discharge kWh | EV/day input | Cycles
const LoadRow = ({ label, dischargeKwh, sessionsValue, cyclesPerDay, onChange, paramKey, isModified, min, max, step }) => (
  <div className={`param-row load-row ${isModified ? 'modified' : ''}`}>
    <div className="param-name">{label}</div>
    <div className="load-discharge">{formatNumber(dischargeKwh, 0)} kWh</div>
    <div className="load-sessions">
      <div className="param-input-group">
        <input
          type="number"
          value={sessionsValue}
          onChange={(e) => onChange(paramKey, parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="param-input"
        />
        <span className="input-suffix">EV per day</span>
      </div>
    </div>
    <div className="load-cycles">{formatNumber(cyclesPerDay, 0)} Cycles per Day</div>
  </div>
);

// Results Summary Component
const ResultsSummary = ({ results, params }) => {
  const baselineIRR = 19.70;
  const baselinePayback = 4.69;
  const irr = results.irr || 0;
  const payback = results.paybackYears || 20;
  const irrDelta = irr - baselineIRR;
  const paybackDelta = payback - baselinePayback;

  return (
    <div className="results-summary">
      <div className="results-header">
        <h3>Projected Returns</h3>
        <div className={`hurdle-badge ${results.meetsHurdle ? 'meets' : 'below'}`}>
          {results.meetsHurdle ? <CheckIcon /> : <AlertIcon />}
          <span>{results.meetsHurdle ? 'Meets Hurdle' : 'Below Hurdle'}</span>
        </div>
      </div>

      <div className="results-grid">
        <div className="result-card primary">
          <span className="result-label">20-Year IRR</span>
          <span className="result-value">{formatNumber(irr, 1)}%</span>
          <span className={`result-delta ${irrDelta >= 0 ? 'positive' : 'negative'}`}>
            {irrDelta >= 0 ? '+' : ''}{formatNumber(irrDelta, 2)}% vs baseline
          </span>
        </div>

        <div className="result-card primary">
          <span className="result-label">Payback Period</span>
          <span className="result-value">{formatNumber(payback, 1)} yrs</span>
          <span className={`result-delta ${paybackDelta <= 0 ? 'positive' : 'negative'}`}>
            {paybackDelta > 0 ? '+' : ''}{formatNumber(paybackDelta, 2)} yrs
          </span>
        </div>

        <div className="result-card">
          <span className="result-label">Net Capex</span>
          <span className="result-value">{formatCurrency(results.capexData?.netCapex)}</span>
          <span className="result-sub">After incentives</span>
        </div>

        <div className="result-card">
          <span className="result-label">NPV @ {params.lpHurdleRate}%</span>
          <span className={`result-value ${results.npvAtHurdle >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(results.npvAtHurdle)}
          </span>
          <span className="result-sub">LP hurdle rate</span>
        </div>
      </div>

      <div className="results-breakdown">
        <div className="breakdown-row">
          <span>Gross Capex</span>
          <span>{formatCurrency(results.capexData?.grossCapex)}</span>
        </div>
        <div className="breakdown-row indent">
          <span>− ITC Benefit</span>
          <span className="positive">({formatCurrency(results.capexData?.itcBenefit)})</span>
        </div>
        <div className="breakdown-row indent">
          <span>− MACRS Benefit</span>
          <span className="positive">({formatCurrency(results.capexData?.macrsBenefit)})</span>
        </div>
        <div className="breakdown-row total">
          <span>Net Investment</span>
          <span>{formatCurrency(results.capexData?.netCapex)}</span>
        </div>
      </div>

      <div className="revenue-milestones">
        <h4>Revenue Milestones</h4>
        <div className="milestones-grid">
          <div className="milestone">
            <span className="milestone-label">Year 1</span>
            <span className="milestone-value">{formatCurrency(results.year1Revenue)}</span>
          </div>
          <div className="milestone">
            <span className="milestone-label">Year 5</span>
            <span className="milestone-value">{formatCurrency(results.year5Revenue)}</span>
          </div>
          <div className="milestone">
            <span className="milestone-label">Year 10</span>
            <span className="milestone-value">{formatCurrency(results.year10Revenue)}</span>
          </div>
          <div className="milestone">
            <span className="milestone-label">Year 20</span>
            <span className="milestone-value">{formatCurrency(results.year20Revenue)}</span>
          </div>
        </div>
        <div className="total-revenue">
          <span>20-Year Total Revenue</span>
          <span>{formatCurrency(results.totalRevenue)}</span>
        </div>
      </div>
    </div>
  );
};

// Main Component
const ModelCalculator = () => {
  const {
    params,
    results,
    updateParam,
    resetParams,
    definitions,
    defaults,
  } = useEbeCalculator();

  const hasAnyModifications = Object.keys(params).some(key => params[key] !== defaults[key]);

  return (
    <div className="model-calculator">
      {/* Header with IRR and Payback */}
      <div className="calculator-header">
        <div className="header-title">
          <h2>Energy Balancing Engine ("eBe")</h2>
        </div>
        <div className="header-metrics">
          <div className="header-metric">
            <span className="metric-label">20-Year IRR</span>
            <span className="metric-value accent">{formatNumber(results.irr, 2)}%</span>
          </div>
          <div className="header-metric">
            <span className="metric-label">Payback</span>
            <span className={`metric-value ${results.meetsHurdle ? 'green' : ''}`}>
              {formatNumber(results.paybackYears, 2)} Years
            </span>
          </div>
        </div>
        {hasAnyModifications && (
          <button className="reset-all-btn" onClick={resetParams}>
            <ResetIcon /> Reset All
          </button>
        )}
      </div>

      <div className="calculator-content">
        {/* Left Panel - Parameters (Excel-style table) */}
        <div className="params-panel">
          <div className="params-table">
            {/* Table Header */}
            <div className="table-header">
              <div className="col-param">Parameter</div>
              <div className="col-value">Value</div>
              <div className="col-aux">Note / Aux. Value</div>
            </div>

            {/* CAPEX Section */}
            <SectionHeader title="Capex" />
            <ParamRow
              label="Number of CVP EV Systems"
              value={1}
              unit=""
              auxValue=""
            />
            <ParamRow
              label="BSCS System Storage Capacity"
              value={240}
              unit="kWh"
              auxValue=""
            />
            <ParamRow
              label="Capex per System"
              value={params.systemCapex}
              unit="$"
              paramKey="systemCapex"
              onChange={updateParam}
              isModified={params.systemCapex !== defaults.systemCapex}
              min={100000}
              max={2000000}
              step={10000}
            />
            <ParamRow
              label="Battery Cell Replacement / System (Every 5 Yrs)"
              value={params.batteryReplacementCost}
              unit="$"
              paramKey="batteryReplacementCost"
              onChange={updateParam}
              isModified={params.batteryReplacementCost !== defaults.batteryReplacementCost}
              min={10000}
              max={200000}
              step={5000}
            />

            {/* INCENTIVES Section */}
            <SectionHeader title="Incentives" />
            <ParamRow
              label="Federal Tax Credit"
              value={params.federalITC}
              unit="%"
              paramKey="federalITC"
              onChange={updateParam}
              isModified={params.federalITC !== defaults.federalITC}
              min={0}
              max={50}
              step={1}
            />
            <ParamRow
              label="Federal Tax Credit Conversion"
              value={params.federalITCConversion}
              unit="%"
              paramKey="federalITCConversion"
              onChange={updateParam}
              isModified={params.federalITCConversion !== defaults.federalITCConversion}
              min={0}
              max={100}
              step={5}
            />
            <ParamRow
              label="Federal Bonus MACRS"
              value={params.bonusMACRS}
              unit="%"
              paramKey="bonusMACRS"
              onChange={updateParam}
              isModified={params.bonusMACRS !== defaults.bonusMACRS}
              min={0}
              max={100}
              step={5}
            />
            <ParamRow
              label="Federal Tax Rate"
              value={params.federalTaxRate}
              unit="%"
              paramKey="federalTaxRate"
              onChange={updateParam}
              isModified={params.federalTaxRate !== defaults.federalTaxRate}
              min={0}
              max={40}
              step={1}
            />
            <ParamRow
              label="State Tax Rate"
              value={params.stateTaxRate}
              unit="%"
              paramKey="stateTaxRate"
              onChange={updateParam}
              isModified={params.stateTaxRate !== defaults.stateTaxRate}
              min={0}
              max={15}
              step={1}
            />

            {/* LOAD Section */}
            <SectionHeader title="Load" />
            <ParamRow
              label="Energy per EV Session"
              value={params.energyPerSession}
              unit="kWh"
              paramKey="energyPerSession"
              onChange={updateParam}
              isModified={params.energyPerSession !== defaults.energyPerSession}
              min={5}
              max={100}
              step={1}
            />

            {/* Load Table Header */}
            <div className="load-table-header">
              <div className="col-param"></div>
              <div className="col-discharge"></div>
              <div className="col-sessions"></div>
              <div className="col-cycles"></div>
            </div>

            <LoadRow
              label="Daily Discharge to EV Load Year 1"
              dischargeKwh={results.dailyDischargeYear1}
              sessionsValue={params.sessionsPerDayYear1}
              cyclesPerDay={results.cyclesPerDayYear1}
              paramKey="sessionsPerDayYear1"
              onChange={updateParam}
              isModified={params.sessionsPerDayYear1 !== defaults.sessionsPerDayYear1}
              min={1}
              max={100}
              step={1}
            />
            <LoadRow
              label="Daily Discharge to EV Load Year 2"
              dischargeKwh={results.dailyDischargeYear2}
              sessionsValue={params.sessionsPerDayYear2}
              cyclesPerDay={results.cyclesPerDayYear2}
              paramKey="sessionsPerDayYear2"
              onChange={updateParam}
              isModified={params.sessionsPerDayYear2 !== defaults.sessionsPerDayYear2}
              min={1}
              max={100}
              step={1}
            />
            <LoadRow
              label="Daily Discharge to EV Load Year 3-5"
              dischargeKwh={results.dailyDischargeYear3to5}
              sessionsValue={params.sessionsPerDayYear3to5}
              cyclesPerDay={results.cyclesPerDayYear3to5}
              paramKey="sessionsPerDayYear3to5"
              onChange={updateParam}
              isModified={params.sessionsPerDayYear3to5 !== defaults.sessionsPerDayYear3to5}
              min={1}
              max={100}
              step={1}
            />
            <LoadRow
              label="Daily Discharge to EV Load Year 6-20"
              dischargeKwh={results.dailyDischargeYear6to20}
              sessionsValue={params.sessionsPerDayYear6to20}
              cyclesPerDay={results.cyclesPerDayYear6to20}
              paramKey="sessionsPerDayYear6to20"
              onChange={updateParam}
              isModified={params.sessionsPerDayYear6to20 !== defaults.sessionsPerDayYear6to20}
              min={1}
              max={100}
              step={1}
            />

            <ParamRow
              label="System RTE"
              value={params.systemRTE}
              unit="%"
              paramKey="systemRTE"
              onChange={updateParam}
              isModified={params.systemRTE !== defaults.systemRTE}
              min={70}
              max={98}
              step={1}
              auxValue="Discharge-Side Loss"
            />

            {/* RATES Section */}
            <SectionHeader title="Rates" />
            <ParamRow
              label="EV Fast Charging"
              value={params.blendedEvRate}
              unit="$/kWh"
              paramKey="blendedEvRate"
              onChange={updateParam}
              isModified={params.blendedEvRate !== defaults.blendedEvRate}
              min={0.1}
              max={2.0}
              step={0.01}
            />
            <ParamRow
              label="Rate Inflation (Annual)"
              value={params.rateInflation}
              unit="%"
              paramKey="rateInflation"
              onChange={updateParam}
              isModified={params.rateInflation !== defaults.rateInflation}
              min={0}
              max={15}
              step={1}
            />
            <ParamRow
              label="Tariff Blended Total (24 Hours)"
              value={params.gridRechargeCost}
              unit="$/kWh"
              paramKey="gridRechargeCost"
              onChange={updateParam}
              isModified={params.gridRechargeCost !== defaults.gridRechargeCost}
              min={0.05}
              max={0.5}
              step={0.001}
            />
            <ParamRow
              label="Tariff Inflation (Annual)"
              value={params.gridCostInflation}
              unit="%"
              paramKey="gridCostInflation"
              onChange={updateParam}
              isModified={params.gridCostInflation !== defaults.gridCostInflation}
              min={0}
              max={10}
              step={1}
            />

            {/* O&M Section */}
            <SectionHeader title="O&M" />
            <ParamRow
              label="Host Profit Share"
              value={params.hostProfitShare}
              unit="%"
              paramKey="hostProfitShare"
              onChange={updateParam}
              isModified={params.hostProfitShare !== defaults.hostProfitShare}
              min={0}
              max={30}
              step={1}
              auxValue="EV - Recharge"
            />
            <ParamRow
              label="NOC License Fee"
              value={params.nocLicenseFee}
              unit="%"
              paramKey="nocLicenseFee"
              onChange={updateParam}
              isModified={params.nocLicenseFee !== defaults.nocLicenseFee}
              min={0}
              max={50}
              step={5}
              auxValue="EV - Recharge - Host"
            />
            <ParamRow
              label="Annual Maintenance Cost"
              value={params.annualMaintenance}
              unit="$"
              paramKey="annualMaintenance"
              onChange={updateParam}
              isModified={params.annualMaintenance !== defaults.annualMaintenance}
              min={500}
              max={10000}
              step={100}
            />
            <ParamRow
              label="Annual Inflation for Maintenance"
              value={params.maintenanceInflation}
              unit="%"
              paramKey="maintenanceInflation"
              onChange={updateParam}
              isModified={params.maintenanceInflation !== defaults.maintenanceInflation}
              min={0}
              max={10}
              step={1}
            />

            {/* LP HURDLE Section */}
            <SectionHeader title="LP Hurdle Rate" />
            <ParamRow
              label="LP Minimum (Annual)"
              value={params.lpMinimum}
              unit="$"
              paramKey="lpMinimum"
              onChange={updateParam}
              isModified={params.lpMinimum !== defaults.lpMinimum}
              min={0}
              max={200000}
              step={5000}
            />
            <ParamRow
              label="LP Hurdle Rate"
              value={params.lpHurdleRate}
              unit="%"
              paramKey="lpHurdleRate"
              onChange={updateParam}
              isModified={params.lpHurdleRate !== defaults.lpHurdleRate}
              min={5}
              max={25}
              step={1}
            />

            {/* Version Footer */}
            <div className="table-footer">
              <span>eBe v8.3</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="results-panel">
          <ResultsSummary results={results} params={params} />
        </div>
      </div>
    </div>
  );
};

export default ModelCalculator;
