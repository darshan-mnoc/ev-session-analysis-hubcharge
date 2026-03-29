/**
 * Filters Section Component
 * Contains all filter controls for session data
 */

import React from "react";
import {
  SiteIcon,
  ChargerIcon,
  ConnectorIcon,
  EnergyIcon,
  CalendarIcon,
  ClockIcon,
  CostIcon,
  BatteryIcon,
  ExtensionIcon,
} from "../common/Icons";

const FiltersSection = ({
  filters,
  filterOptions,
  rangeFilters,
  onFilterChange,
  onRangeFilterChange,
  onReset,
  onDownloadCSV,
}) => {
  const {
    durationMin,
    durationMax,
    priceFilter,
    socMin,
    socMax,
    extensionMin,
    extensionMax,
    startDate,
    endDate,
    kwhMin,
    kwhMax,
    costPerKwhMin,
    costPerKwhMax,
  } = rangeFilters;

  return (
    <section className="filters-section">
      <div className="filters-header">
        <h2>Filters</h2>
        <div className="filters-actions">
          <button
            className="download-csv-btn"
            onClick={onDownloadCSV}
            title="Download CSV"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>CSV</span>
          </button>
          <button className="reset-filters-btn" onClick={onReset}>
            Clear
          </button>
        </div>
      </div>
      <div className="filters-grid">
        {/* Site filter */}
        <div className="filter-group">
          <label><SiteIcon size={11} /> Site</label>
          <select
            value={filters.site}
            onChange={(e) => onFilterChange("site", e.target.value)}
          >
            <option value="all">All Sites</option>
            {filterOptions.sites.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Machine filter */}
        <div className="filter-group">
          <label><ChargerIcon size={11} /> Machine</label>
          <select
            value={filters.machineType}
            onChange={(e) => onFilterChange("machineType", e.target.value)}
          >
            <option value="all">All Machines</option>
            {filterOptions.machineTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Connector filter */}
        <div className="filter-group">
          <label><ConnectorIcon size={11} /> Connector</label>
          <select
            value={filters.connectorType}
            onChange={(e) => onFilterChange("connectorType", e.target.value)}
          >
            <option value="all">All Connectors</option>
            {filterOptions.connectorTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Voltage architecture filter */}
        <div className="filter-group">
          <label><EnergyIcon size={11} /> Architecture</label>
          <select
            value={filters.voltageArch}
            onChange={(e) => onFilterChange("voltageArch", e.target.value)}
          >
            <option value="all">All</option>
            <option value="400V">400V</option>
            <option value="800V">800V</option>
          </select>
        </div>

        {/* Date Range filter */}
        <div className={`filter-group date-filter ${startDate || endDate ? "active" : ""}`}>
          <label><CalendarIcon size={11} /> Date Range</label>
          <div className="date-input-container">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onRangeFilterChange("startDate", e.target.value)}
              className="date-input"
              placeholder="Start"
            />
            <span className="range-separator">&ndash;</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onRangeFilterChange("endDate", e.target.value)}
              className="date-input"
              placeholder="End"
            />
            {(startDate || endDate) && (
              <button
                className="range-clear-btn"
                onClick={() => {
                  onRangeFilterChange("startDate", "");
                  onRangeFilterChange("endDate", "");
                }}
                title="Clear"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Duration filter */}
        <div className={`filter-group range-filter ${durationMin !== "" || durationMax !== "" ? "active" : ""}`}>
          <label><ClockIcon size={11} /> Duration (min)</label>
          <div className="range-input-container">
            <input
              type="number"
              min="0"
              max="300"
              value={durationMin}
              placeholder="Min"
              onChange={(e) =>
                onRangeFilterChange("durationMin", e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
              }
              className="range-input"
            />
            <span className="range-separator">&ndash;</span>
            <input
              type="number"
              min="0"
              max="300"
              value={durationMax}
              placeholder="Max"
              onChange={(e) =>
                onRangeFilterChange("durationMax", e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
              }
              className="range-input"
            />
            {(durationMin !== "" || durationMax !== "") && (
              <button
                className="range-clear-btn"
                onClick={() => {
                  onRangeFilterChange("durationMin", "");
                  onRangeFilterChange("durationMax", "");
                }}
                title="Clear"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Price filter */}
        <div className={`filter-group price-filter ${priceFilter !== "all" ? "active" : ""}`}>
          <label><CostIcon size={11} /> Price</label>
          <div className="price-input-container">
            <button
              className="price-btn decrement"
              onClick={() => {
                const currentVal = priceFilter === "all" ? 12.5 : Number(priceFilter);
                const newVal = Math.max(0, currentVal - 0.5);
                onRangeFilterChange("priceFilter", Number(newVal.toFixed(2)));
              }}
              disabled={priceFilter !== "all" && Number(priceFilter) <= 0}
            >
              &minus;
            </button>
            <div className="price-input-wrapper">
              <span className="price-symbol">$</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.50"
                value={priceFilter === "all" ? "" : priceFilter}
                placeholder="All"
                onChange={(e) => {
                  const inputVal = e.target.value;
                  if (inputVal === "") {
                    onRangeFilterChange("priceFilter", "all");
                  } else {
                    const val = Math.min(100, Math.max(0, Number(inputVal) || 0));
                    onRangeFilterChange("priceFilter", Number(val.toFixed(2)));
                  }
                }}
                className="price-input"
              />
            </div>
            <button
              className="price-btn increment"
              onClick={() => {
                const currentVal = priceFilter === "all" ? 12 : Number(priceFilter);
                const newVal = Math.min(100, currentVal + 0.5);
                onRangeFilterChange("priceFilter", Number(newVal.toFixed(2)));
              }}
              disabled={priceFilter !== "all" && Number(priceFilter) >= 100}
            >
              +
            </button>
            {priceFilter !== "all" && (
              <button
                className="price-btn clear"
                onClick={() => onRangeFilterChange("priceFilter", "all")}
                title="Clear"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* SOC filter (min/max range) */}
        <div className={`filter-group range-filter ${socMin !== "" || socMax !== "" ? "active" : ""}`}>
          <label><BatteryIcon size={11} /> Start SOC (%)</label>
          <div className="range-input-container">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={socMin}
              placeholder="Min"
              onChange={(e) =>
                onRangeFilterChange("socMin", e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))))
              }
              className="range-input"
            />
            <span className="range-separator">&ndash;</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={socMax}
              placeholder="Max"
              onChange={(e) =>
                onRangeFilterChange("socMax", e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))))
              }
              className="range-input"
            />
            {(socMin !== "" || socMax !== "") && (
              <button
                className="range-clear-btn"
                onClick={() => {
                  onRangeFilterChange("socMin", "");
                  onRangeFilterChange("socMax", "");
                }}
                title="Clear"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Extension filter */}
        <div className={`filter-group range-filter ${extensionMin !== "" || extensionMax !== "" ? "active" : ""}`}>
          <label><ExtensionIcon size={11} /> Extensions</label>
          <div className="range-input-container">
            <input
              type="number"
              min="0"
              max="10"
              value={extensionMin}
              placeholder="Min"
              onChange={(e) =>
                onRangeFilterChange("extensionMin", e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
              }
              className="range-input"
            />
            <span className="range-separator">&ndash;</span>
            <input
              type="number"
              min="0"
              max="10"
              value={extensionMax}
              placeholder="Max"
              onChange={(e) =>
                onRangeFilterChange("extensionMax", e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
              }
              className="range-input"
            />
            {(extensionMin !== "" || extensionMax !== "") && (
              <button
                className="range-clear-btn"
                onClick={() => {
                  onRangeFilterChange("extensionMin", "");
                  onRangeFilterChange("extensionMax", "");
                }}
                title="Clear"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* kWh Range filter */}
        <div className={`filter-group range-filter ${kwhMin !== "" || kwhMax !== "" ? "active" : ""}`}>
          <label><EnergyIcon size={11} /> kWh Range</label>
          <div className="range-input-container">
            <input
              type="number"
              min="0"
              max="500"
              step="0.1"
              value={kwhMin}
              placeholder="Min"
              onChange={(e) =>
                onRangeFilterChange("kwhMin", e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
              }
              className="range-input"
            />
            <span className="range-separator">&ndash;</span>
            <input
              type="number"
              min="0"
              max="500"
              step="0.1"
              value={kwhMax}
              placeholder="Max"
              onChange={(e) =>
                onRangeFilterChange("kwhMax", e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
              }
              className="range-input"
            />
            {(kwhMin !== "" || kwhMax !== "") && (
              <button
                className="range-clear-btn"
                onClick={() => {
                  onRangeFilterChange("kwhMin", "");
                  onRangeFilterChange("kwhMax", "");
                }}
                title="Clear"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* $/kWh Range filter */}
        <div className={`filter-group range-filter ${costPerKwhMin !== "" || costPerKwhMax !== "" ? "active" : ""}`}>
          <label><CostIcon size={11} /> $/kWh Range</label>
          <div className="range-input-container">
            <input
              type="number"
              min="0"
              max="10"
              step="0.01"
              value={costPerKwhMin}
              placeholder="Min"
              onChange={(e) =>
                onRangeFilterChange("costPerKwhMin", e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
              }
              className="range-input"
            />
            <span className="range-separator">&ndash;</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.01"
              value={costPerKwhMax}
              placeholder="Max"
              onChange={(e) =>
                onRangeFilterChange("costPerKwhMax", e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
              }
              className="range-input"
            />
            {(costPerKwhMin !== "" || costPerKwhMax !== "") && (
              <button
                className="range-clear-btn"
                onClick={() => {
                  onRangeFilterChange("costPerKwhMin", "");
                  onRangeFilterChange("costPerKwhMax", "");
                }}
                title="Clear"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FiltersSection;
