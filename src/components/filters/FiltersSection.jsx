/**
 * Filters Section Component
 * Contains all filter controls for session data
 */

import React from "react";

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
    socFilter,
    extensionMin,
    extensionMax,
    refundFilter,
    includeRefunded,
    startDate,
    endDate,
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
            <span>Download CSV</span>
          </button>
          <button className="reset-filters-btn" onClick={onReset}>
            Clear All
          </button>
        </div>
      </div>
      <div className="filters-grid">
        {/* Site filter */}
        <div className="filter-group">
          <label>Site</label>
          <select
            value={filters.site}
            onChange={(e) => onFilterChange("site", e.target.value)}
          >
            <option value="all">All Sites</option>
            {filterOptions.sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Machine filter */}
        <div className="filter-group">
          <label>Machine</label>
          <select
            value={filters.machineType}
            onChange={(e) => onFilterChange("machineType", e.target.value)}
          >
            <option value="all">All Machines</option>
            {filterOptions.machineTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Connector filter */}
        <div className="filter-group">
          <label>Connector</label>
          <select
            value={filters.connectorType}
            onChange={(e) => onFilterChange("connectorType", e.target.value)}
          >
            <option value="all">All Connectors</option>
            {filterOptions.connectorTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Voltage architecture filter */}
        <div className="filter-group">
          <label>EV Battery Architecture</label>
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
        <div
          className={`filter-group date-filter ${startDate || endDate ? "active" : ""}`}
        >
          <label>Date Range</label>
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
        <div
          className={`filter-group range-filter ${durationMin !== "" || durationMax !== "" ? "active" : ""}`}
        >
          <label>Duration (min)</label>
          <div className="range-input-container">
            <input
              type="number"
              min="0"
              max="300"
              value={durationMin}
              placeholder="Min"
              onChange={(e) =>
                onRangeFilterChange(
                  "durationMin",
                  e.target.value === ""
                    ? ""
                    : Math.max(0, Number(e.target.value))
                )
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
                onRangeFilterChange(
                  "durationMax",
                  e.target.value === ""
                    ? ""
                    : Math.max(0, Number(e.target.value))
                )
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
        <div
          className={`filter-group price-filter ${priceFilter !== "all" ? "active" : ""}`}
        >
          <label>Price Filter</label>
          <div className="price-input-container">
            <button
              className="price-btn decrement"
              onClick={() => {
                const currentVal =
                  priceFilter === "all" ? 12.5 : Number(priceFilter);
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
                    const val = Math.min(
                      100,
                      Math.max(0, Number(inputVal) || 0)
                    );
                    onRangeFilterChange("priceFilter", Number(val.toFixed(2)));
                  }
                }}
                className="price-input"
              />
            </div>
            <button
              className="price-btn increment"
              onClick={() => {
                const currentVal =
                  priceFilter === "all" ? 12 : Number(priceFilter);
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
                title="Clear price filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* SOC filter */}
        <div
          className={`filter-group soc-filter ${socFilter !== "all" ? "active" : ""}`}
        >
          <label>Max Start SOC (%)</label>
          <div className="soc-input-container">
            <button
              className="soc-btn decrement"
              onClick={() => {
                const currentVal =
                  socFilter === "all" ? 30 : Number(socFilter);
                const newVal = Math.max(5, currentVal - 5);
                onRangeFilterChange("socFilter", newVal);
              }}
              disabled={socFilter !== "all" && Number(socFilter) <= 5}
            >
              &minus;
            </button>
            <div className="soc-input-wrapper">
              <input
                type="number"
                min="5"
                max="100"
                step="5"
                value={socFilter === "all" ? "" : socFilter}
                placeholder="All"
                onChange={(e) => {
                  const inputVal = e.target.value;
                  if (inputVal === "") {
                    onRangeFilterChange("socFilter", "all");
                  } else {
                    const val = Math.min(
                      100,
                      Math.max(5, Number(inputVal) || 5)
                    );
                    onRangeFilterChange("socFilter", val);
                  }
                }}
                className="soc-input"
              />
              <span className="soc-unit">%</span>
            </div>
            <button
              className="soc-btn increment"
              onClick={() => {
                const currentVal =
                  socFilter === "all" ? 25 : Number(socFilter);
                const newVal = Math.min(100, currentVal + 5);
                onRangeFilterChange("socFilter", newVal);
              }}
              disabled={socFilter !== "all" && Number(socFilter) >= 100}
            >
              +
            </button>
            {socFilter !== "all" && (
              <button
                className="soc-btn clear"
                onClick={() => onRangeFilterChange("socFilter", "all")}
                title="Clear SOC filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Extension filter */}
        <div
          className={`filter-group range-filter ${extensionMin !== "" || extensionMax !== "" ? "active" : ""}`}
        >
          <label>Extensions (5-min)</label>
          <div className="range-input-container">
            <input
              type="number"
              min="0"
              max="10"
              value={extensionMin}
              placeholder="Min"
              onChange={(e) =>
                onRangeFilterChange(
                  "extensionMin",
                  e.target.value === ""
                    ? ""
                    : Math.max(0, Number(e.target.value))
                )
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
                onRangeFilterChange(
                  "extensionMax",
                  e.target.value === ""
                    ? ""
                    : Math.max(0, Number(e.target.value))
                )
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

        {/* Refund filter */}
        <div
          className={`filter-group refund-filter ${refundFilter !== "default" || includeRefunded ? "active" : ""}`}
        >
          <label>Refund</label>
          <div className="refund-controls">
            <select
              value={refundFilter}
              onChange={(e) =>
                onRangeFilterChange("refundFilter", e.target.value)
              }
            >
              <option value="default">Default</option>
              <option value="all">All Refunded</option>
            </select>
          </div>
        </div>

        {/* Include refunded checkbox */}
        <div
          className={`filter-group refund-filter ${refundFilter !== "default" || includeRefunded ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <label className="refund-include-label">
            <input
              type="checkbox"
              checked={includeRefunded}
              onChange={(e) =>
                onRangeFilterChange("includeRefunded", e.target.checked)
              }
            />
            <span style={{ marginLeft: "5px" }}>Include Refunded Sessions</span>
          </label>
        </div>
      </div>
    </section>
  );
};

export default FiltersSection;
