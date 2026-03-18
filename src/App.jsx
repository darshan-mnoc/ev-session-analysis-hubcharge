/**
 * EV Session Dashboard - Main App Component
 *
 * This is a refactored, modular version of the dashboard.
 * Components, hooks, and utilities are organized in separate files.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "./AuthContext";
import "./App.css";

// Components
import {
  ProgressBar,
  Pagination,
  ChartInfoPanel,
  PerformanceBandChart,
  SessionCard,
  SessionDetails,
  FiltersSection,
  StatsDashboard,
  LoginForm,
  AccessDenied,
  AuthLoading,
} from "./components";

// Hooks
import {
  useSessionData,
  useFilteredData,
  useStats,
  usePerformanceChartData,
  useChartDataSelector,
} from "./hooks";

// Utils & Config
import { downloadCSV, getYAxisUnit } from "./utils/helpers";
import { DEFAULT_FILTERS, ITEMS_PER_PAGE } from "./constants/config";

function App() {
  // Auth state
  const {
    isAuthenticated,
    hasApiAccess,
    isLoading: authLoading,
    apiAccessError,
    logout,
    user,
  } = useAuth();

  // Data fetching
  const { data, loading, progress, progressStatus, refreshData } =
    useSessionData();

  // console.log("Raw session data loaded:", data, "sessions");

  // Filter states
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [rangeFilters, setRangeFilters] = useState({
    durationMin: "",
    durationMax: "",
    priceFilter: "all",
    socFilter: "all",
    extensionMin: "",
    extensionMax: "",
    startDate: "",
    endDate: "",
    kwhMin: "",
    kwhMax: "",
    costPerKwhMin: "",
    costPerKwhMax: "",
  });

  // UI states
  const [selectedSession, setSelectedSession] = useState(null);
  const [chartTimeRange, setChartTimeRange] = useState("full");
  const [currentPage, setCurrentPage] = useState(1);

  // Performance chart states
  const [kwChartView, setKwChartView] = useState("400V");
  const [chartYAxis, setChartYAxis] = useState("kW");
  const [chartXAxis, setChartXAxis] = useState("minutes");
  const [chartInfoData, setChartInfoData] = useState(null);
  const [lockedChartInfo, setLockedChartInfo] = useState(null);

  // Filtered data
  const filteredData = useFilteredData(data, filters, rangeFilters);

  // Stats
  const stats = useStats(filteredData);

  // Performance chart data
  const performanceChartData = usePerformanceChartData(filteredData);
  const getChartData = useChartDataSelector(performanceChartData);

  // Filter options based on data
  const filterOptions = useMemo(() => {
    const sites = [...new Set(data.map((d) => d.ems_site))]
      .filter(Boolean)
      .sort();
    const machineTypes = [...new Set(data.map((d) => d.machine_type))]
      .filter(Boolean)
      .sort();
    const connectorTypes = [...new Set(data.map((d) => d.connector_type))]
      .filter(Boolean)
      .sort();
    const cpids = [...new Set(data.map((d) => d.cpid))].filter(Boolean).sort();
    const statuses = [...new Set(data.map((d) => d.status))]
      .filter(Boolean)
      .sort();
    return { sites, machineTypes, connectorTypes, cpids, statuses };
  }, [data]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, rangeFilters]);

  // Filter handlers
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRangeFilterChange = useCallback((key, value) => {
    setRangeFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setRangeFilters({
      durationMin: "",
      durationMax: "",
      priceFilter: "all",
      socFilter: "all",
      extensionMin: "",
      extensionMax: "",
      startDate: "",
      endDate: "",
      kwhMin: "",
      kwhMax: "",
      costPerKwhMin: "",
      costPerKwhMax: "",
    });
  }, []);

  const handleDownloadCSV = useCallback(() => {
    downloadCSV(filteredData);
  }, [filteredData]);

  // Auth loading state
  if (authLoading) {
    return <AuthLoading />;
  }

  // Loading screen
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h2>Loading EV Session Data</h2>
          <ProgressBar progress={progress} status={progressStatus} />
        </div>
      </div>
    );
  }

  // Show login form when not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Show API access error
  if (apiAccessError) {
    return <AccessDenied />;
  }

  return (
    <>
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <h2>EV Session Dashboard</h2>
          <p className="header-subtitle">MBS Analytics</p>
        </div>
        <div className="header-right">
          {user && <span className="user-email">{user.email}</span>}
          <div className="search-box">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search sessions..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>
          <button
            className="refresh-btn-header"
            onClick={refreshData}
            title="Refresh data"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            className="logout-btn-header"
            onClick={logout}
            title="Sign out"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Filters */}
      <FiltersSection
        filters={filters}
        filterOptions={filterOptions}
        rangeFilters={rangeFilters}
        onFilterChange={handleFilterChange}
        onRangeFilterChange={handleRangeFilterChange}
        onReset={handleResetFilters}
        onDownloadCSV={handleDownloadCSV}
      />

      {/* Statistics Dashboard */}
      <StatsDashboard stats={stats} />

      {/* Performance Charts Section */}
      {(performanceChartData.count400V > 0 ||
        performanceChartData.count800V > 0) && (
        <div className="performance-charts-section">
          <div className="performance-charts-with-panel">
            {/* Main Performance Chart with Axis Selection */}
            <div className="performance-chart-box wide">
              <div className="chart-box-header unified">
                <div className="chart-controls-row">
                  <div className="chart-title-group">
                    <h3>Performance Analysis</h3>
                    <span className="chart-subtitle">
                      {kwChartView} Architecture &bull;{" "}
                      {performanceChartData[`count${kwChartView}`]} sessions
                    </span>
                  </div>
                  <div className="chart-selectors">
                    <div className="selector-group">
                      <span className="selector-label">Y-Axis</span>
                      <select
                        value={chartYAxis}
                        onChange={(e) => {
                          const newYAxis = e.target.value;
                          setChartYAxis(newYAxis);
                          // When cost is selected and X-axis is SOC, switch to time
                          if (newYAxis === "cost" && chartXAxis === "soc") {
                            setChartXAxis("minutes");
                          }
                        }}
                        className="chart-select"
                      >
                        <option value="kW">Power (kW)</option>
                        <option value="kWh">Energy (kWh)</option>
                        <option value="cost">Cost ($/kWh)</option>
                        <option value="voltage">Voltage (V)</option>
                        <option value="current">Current (A)</option>
                      </select>
                    </div>
                    <div className="selector-group">
                      <span className="selector-label">X-Axis</span>
                      <select
                        value={chartXAxis}
                        onChange={(e) => setChartXAxis(e.target.value)}
                        className="chart-select"
                      >
                        <option value="minutes">Time (min)</option>
                        <option value="soc" disabled={chartYAxis === "cost"}>
                          SOC (%)
                        </option>
                        {/* <option value="kwh">Energy (kWh)</option> */}
                      </select>
                    </div>
                    <div className="selector-group">
                      <span className="selector-label">Arch</span>
                      <div className="arch-toggle">
                        <button
                          className={`arch-btn ${kwChartView === "400V" ? "active" : ""}`}
                          onClick={() => setKwChartView("400V")}
                        >
                          400V
                        </button>
                        <button
                          className={`arch-btn accent ${kwChartView === "800V" ? "active" : ""}`}
                          onClick={() => setKwChartView("800V")}
                        >
                          800V
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="chart-container">
                {(() => {
                  const chartKey = kwChartView === "400V" ? "400V" : "800V";
                  const chartData = getChartData(
                    chartKey,
                    chartYAxis,
                    chartXAxis,
                  );
                  const unit = getYAxisUnit(chartYAxis);
                  const accentColor =
                    kwChartView === "400V" ? "#22c55e" : "var(--accent)";
                  const xAxisKey =
                    chartXAxis === "soc"
                      ? "soc"
                      : chartXAxis === "kwh"
                        ? "kwh"
                        : "minute";
                  const xAxisLabels = {
                    minutes: "Minutes",
                    soc: "SOC %",
                    kwh: "kWh",
                  };
                  // Check if we're in cost mode with time x-axis (dual Y-axis mode)
                  const isCostWithTime =
                    chartYAxis === "cost" && chartXAxis === "minutes";

                  if (chartData.sessionCount > 0) {
                    return (
                      <PerformanceBandChart
                        data={chartData.chartData}
                        unit={unit}
                        accentColor={accentColor}
                        sessionCount={chartData.sessionCount}
                        colors={chartData.colors}
                        chartLabel={`${chartYAxis} · ${kwChartView} Architecture`}
                        xAxisKey={xAxisKey}
                        xAxisLabel={xAxisLabels[chartXAxis] || "Minutes"}
                        onHover={setChartInfoData}
                        onPointClick={(d) =>
                          setLockedChartInfo((prev) =>
                            prev?.[xAxisKey] === d?.[xAxisKey] &&
                            prev?.chartLabel === d?.chartLabel
                              ? null
                              : d,
                          )
                        }
                        dualYAxis={isCostWithTime}
                        secondaryUnit="kWh"
                      />
                    );
                  }
                  return (
                    <div className="no-data-message">
                      No sessions with bucket data for {kwChartView}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Shared Info Panel */}
            <ChartInfoPanel
              hoverData={chartInfoData}
              lockedData={lockedChartInfo}
              onUnlock={() => setLockedChartInfo(null)}
            />
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="content-grid">
        {/* Sessions List */}
        <section className="sessions-section">
          <div className="section-header">
            <h2>Sessions</h2>
            <span className="session-count">{filteredData.length} results</span>
          </div>
          <div className="sessions-list">
            {paginatedData.map((session) => (
              <SessionCard
                key={session.full_id}
                session={session}
                isSelected={selectedSession?.full_id === session.full_id}
                onClick={() => setSelectedSession(session)}
              />
            ))}
            {filteredData.length === 0 && (
              <div className="empty-state">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <p>No sessions match your filters</p>
              </div>
            )}
          </div>
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={filteredData.length}
            onPageChange={setCurrentPage}
          />
        </section>

        {/* Chart Panel */}
        <section className="chart-panel">
          <SessionDetails
            session={selectedSession}
            chartTimeRange={chartTimeRange}
            onTimeRangeChange={setChartTimeRange}
            onClose={() => setSelectedSession(null)}
          />
        </section>
      </div>
    </>
  );
}

export default App;
