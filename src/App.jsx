import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area,
} from "recharts";
import { useAuth } from "./AuthContext.jsx";
import "./App.css";
import Logo from "./assets/hubcharge-logo.png";

// ============ CONFIGURATION ============
const API_CONFIG = {
  BASE_URL: "https://hubcharge.micronocinc.com/management/api",
  // Add your credentials here
  USERNAME: "", // <-- Enter username
  PASSWORD: "", // <-- Enter password
};

// Machine categorization rules
const getMachineInfo = (cpid, connectorId) => {
  if (cpid === "MBS_1" && connectorId === 1)
    return { machine_type: "winline", connector_type: "CCS1" };
  if (cpid === "MBS_1" && connectorId === 2)
    return { machine_type: "winline", connector_type: "NACS" };
  if (cpid === "MBS_2" && connectorId === 1)
    return { machine_type: "yotai", connector_type: "CCS1" };
  if (cpid === "MBS_2" && connectorId === 2)
    return { machine_type: "yotai", connector_type: "NACS" };
  return { machine_type: "unknown", connector_type: "unknown" };
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="tooltip-header">{label}</div>
        <div className="tooltip-content">
          {payload.map((entry, index) => (
            <div key={index} className="tooltip-row">
              <span
                className="tooltip-dot"
                style={{ background: entry.color }}
              />
              <span className="tooltip-name">{entry.name}</span>
              <span className="tooltip-value">
                {typeof entry.value === "number"
                  ? entry.value.toFixed(2)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const PANEL_PAGE_SIZE = 10;

const ChartInfoPanel = ({ hoverData, lockedData, onUnlock }) => {
  const [page, setPage] = useState(0);
  const data = lockedData ?? hoverData;
  const locked = !!lockedData;

  // Reset page when data changes
  useEffect(() => {
    setPage(0);
  }, [data?.minute, data?.chartKey, data?.sessions?.length]);

  if (!data) {
    return (
      <div className="chart-info-panel empty">
        <div className="cip-empty-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            width="32"
            height="32"
          >
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
          </svg>
        </div>
        <p className="cip-empty-title">Session Details</p>
        <p className="cip-empty-hint">Hover chart to see car data</p>
      </div>
    );
  }

  const { minute, sessions = [], unit, chartLabel } = data;

  // Sort sessions by value (low to high)
  const sortedSessions = [...sessions].sort(
    (a, b) => (a.value || 0) - (b.value || 0),
  );

  const totalPages = Math.ceil(sortedSessions.length / PANEL_PAGE_SIZE);
  const paged = sortedSessions.slice(
    page * PANEL_PAGE_SIZE,
    (page + 1) * PANEL_PAGE_SIZE,
  );

  return (
    <div className={`chart-info-panel ${locked ? "locked" : ""}`}>
      {/* Header with minute and car count */}
      <div className="cip-header-compact">
        <div className="cip-header-top">
          <span className="cip-chart-label">{chartLabel}</span>
          {locked && (
            <button
              className="cip-unlock-btn"
              style={{ color: "white" }}
              onClick={() => onUnlock?.()}
              title="Click to unlock"
            >
              📌 Unlock
            </button>
          )}
        </div>
        <div className="cip-header-main">
          <span className="cip-minute-large">Minute {minute}</span>
          <span className="cip-car-count">{sessions.length} cars</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="cip-column-header">
        <span className="cip-col-car">Car ID</span>
        <span className="cip-col-value">{unit}</span>
      </div>

      {/* Session rows - sorted low to high */}
      <div className="cip-sessions-list">
        {paged.map((s, i) => (
          <div key={i} className="cip-session-row">
            <span className="cip-dot" style={{ background: s.color }} />
            <span className="cip-id">{s.id}</span>
            <span className="cip-val">
              {s.value?.toFixed(1)}
              <small> {unit}</small>
            </span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="cip-pagination">
          <button
            className="cip-page-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ‹
          </button>
          <span className="cip-page-info">
            {page + 1} / {totalPages}
          </span>
          <button
            className="cip-page-btn"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

const INDIVIDUAL_THRESHOLD = 3; // only show individual lines for ≤3 sessions

const PerformanceBandChart = ({
  data,
  unit,
  accentColor = "#22c55e",
  sessionCount,
  colors,
  chartLabel = "",
  onHover,
  onPointClick,
}) => {
  const showIndividual = sessionCount <= INDIVIDUAL_THRESHOLD;
  const gradId = `gb_${unit.replace(/\W/g, "")}_${accentColor.replace(/\W/g, "")}`;

  const extractPoint = (label) => {
    const point = data.find((d) => d.minute === label);
    if (!point) return null;
    const sessions = [];
    // Find all session keys and extract data for each
    const sessionKeys = Object.keys(point).filter((k) =>
      k.startsWith("session_"),
    );
    sessionKeys.forEach((key) => {
      const idx = key.replace("session_", "");
      const value = point[key];
      const id = point[`id_${idx}`];
      const color = point[`color_${idx}`];
      if (value != null && id != null) {
        sessions.push({ id, value, color });
      }
    });
    return {
      minute: point.minute,
      sessions,
      median: point.median ?? point.average ?? 0,
      p10: point.band_outer_base ?? 0,
      p90: (point.band_outer_base ?? 0) + (point.band_outer_delta ?? 0),
      p25: point.band_inner_base ?? 0,
      p75: (point.band_inner_base ?? 0) + (point.band_inner_delta ?? 0),
      showBands: !showIndividual,
      unit,
      chartLabel,
    };
  };

  const handleMouseMove = (state) => {
    if (!state?.activeLabel) return;
    onHover?.(extractPoint(state.activeLabel));
  };

  const handleMouseLeave = () => onHover?.(null);

  const handleClick = (state) => {
    if (!state?.activeLabel) return;
    onPointClick?.(extractPoint(state.activeLabel));
  };

  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart
        data={data}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: "crosshair", outline: "none" }}
      >
        <defs>
          <linearGradient id={`${gradId}_outer`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id={`${gradId}_inner`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.38} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0.12} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="minute"
          axisLine={false}
          tickLine={false}
          stroke="var(--text-muted)"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          // label={{
          //   value: "Minute",
          //   position: "insideBottom",
          //   fill: "var(--text-secondary)",
          //   fontSize: 11,
          // }}
        />
        <YAxis
          stroke="var(--text-muted)"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          label={{
            value: unit,
            // angle: -90,
            position: "insideLeft",
            fill: "var(--text-secondary)",
            fontSize: 11,
          }}
        />

        {/* Light tooltip showing minute and car count */}
        <Tooltip
          content={({ label, payload }) => {
            if (!label || !payload || payload.length === 0) return null;
            // Count valid sessions - same logic as extractPoint
            const pointData = payload[0]?.payload || {};
            let carCount = 0;
            Object.keys(pointData).forEach((key) => {
              if (key.startsWith("session_")) {
                const idx = key.replace("session_", "");
                if (pointData[key] != null && pointData[`id_${idx}`] != null) {
                  carCount++;
                }
              }
            });
            return (
              <div className="chart-mini-tooltip">
                <span>Min {label}</span>
                <span className="mini-tooltip-sep">•</span>
                <span>{carCount} cars</span>
              </div>
            );
          }}
          wrapperStyle={{ outline: "none" }}
        />

        {showIndividual ? (
          Array.from({ length: sessionCount }).map((_, i) => (
            <Line
              key={`s_${i}`}
              type="monotone"
              dataKey={`session_${i}`}
              stroke={colors[i]}
              strokeWidth={1.5}
              dot={false}
              opacity={0.7}
              legendType="none"
            />
          ))
        ) : (
          <>
            <Area
              type="monotone"
              dataKey="band_outer_base"
              stackId="outer"
              stroke="none"
              fill="transparent"
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="band_outer_delta"
              stackId="outer"
              stroke={accentColor}
              strokeWidth={0.5}
              strokeOpacity={0.2}
              fill={`url(#${gradId}_outer)`}
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="band_inner_base"
              stackId="inner"
              stroke="none"
              fill="transparent"
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="band_inner_delta"
              stackId="inner"
              stroke="none"
              fill={`url(#${gradId}_inner)`}
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
            />
          </>
        )}

        <Line
          type="monotone"
          dataKey={showIndividual ? "average" : "median"}
          stroke={accentColor}
          strokeWidth={2.5}
          dot={false}
          activeDot={{
            r: 5,
            fill: accentColor,
            stroke: "#fff",
            strokeWidth: 1.5,
          }}
          name={showIndividual ? "Average" : "Median"}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Progress Bar Component
const ProgressBar = ({ progress, status }) => (
  <div className="progress-container">
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${progress}%` }} />
    </div>
    <p className="progress-status">{status}</p>
    <p className="progress-percent">{progress}%</p>
  </div>
);

// Login Component
const LoginForm = ({ onLogin, loading }) => {
  const [username, setUsername] = useState(API_CONFIG.USERNAME);
  const [password, setPassword] = useState(API_CONFIG.PASSWORD);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div>
            <img
              src={Logo}
              alt="icon"
              style={{ width: 200, height: 100, objectFit: "contain" }}
            />
          </div>
          <h1>EV Session Analytics</h1>
          <p>Sign in to access the dashboard</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Connecting..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, value, label, color }) => (
  <div className="stat-card" style={{ "--accent-color": color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  </div>
);

// Session Card Component
const SessionCard = ({ session, isSelected, onClick }) => (
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <div>
          <span className="metric-value">{session.total_kwh.toFixed(1)}</span>
          <span className="metric-unit">kWh</span>
        </div>
      </div>
      <div className="metric">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <div>
          <span className="metric-value">{session.duration_minutes}</span>
          <span className="metric-unit">min</span>
        </div>
      </div>
      <div className="metric">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M22 11h2v4h-2" />
          <path d="M6 11v4" />
        </svg>
        <div>
          <span className="metric-value">
            {session.soc_start}→{session.soc_end}
          </span>
          <span className="metric-unit">%</span>
        </div>
      </div>
    </div>

    {/* 10-min stats row */}
    <div className="session-10min-stats">
      <div className="stat-10min">
        <span className="stat-10min-label">10min kWh</span>
        <span className="stat-10min-value">
          {(session.kwh_10_min || 0).toFixed(2)}
        </span>
      </div>
      <div className="stat-10min">
        <span className="stat-10min-label">10min SOC</span>
        <span className="stat-10min-value">
          +{(session.soc_10_min_gain || 0).toFixed(0)}%
        </span>
      </div>
    </div>

    <div className="session-card-footer">
      <span
        className={`voltage-badge ${session.voltage_arch === "800V" ? "v800" : "v400"}`}
      >
        {session.voltage_arch || "400V"}
      </span>
      {/* <span className="charger-badge">{session.cpid}</span> */}
      <span className="machine-badge">{session.machine_type}</span>
      <span className="connector-badge">{session.connector_type}</span>
      {session.buckets && session.buckets.length > 0 && (
        <span className="chart-badge">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="12"
            height="12"
          >
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
          </svg>
          Chart
        </span>
      )}
    </div>
  </div>
);

// Chart Component with proper dark theme
const ChartCard = ({
  title,
  data,
  dataKey,
  color,
  unit,
  secondaryDataKey,
  secondaryColor,
  secondaryUnit,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-empty">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`gradient-${dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              {secondaryDataKey && (
                <linearGradient
                  id={`gradient-${secondaryDataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={secondaryColor}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={secondaryColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              dx={-10}
              domain={["auto", "auto"]}
            />
            {secondaryDataKey && (
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
                dx={10}
                domain={["auto", "auto"]}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: "10px" }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 6,
                fill: color,
                stroke: "#1e293b",
                strokeWidth: 2,
              }}
              name={`${dataKey.replace(/([A-Z])/g, " $1").trim()} (${unit})`}
            />
            {secondaryDataKey && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={secondaryColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: secondaryColor,
                  stroke: "#1e293b",
                  strokeWidth: 2,
                }}
                name={`${secondaryDataKey.replace(/([A-Z])/g, " $1").trim()} (${secondaryUnit})`}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Time range options for chart filtering
const TIME_RANGE_OPTIONS = [
  { value: 10, label: "First 10 min" },
  { value: 15, label: "First 15 min" },
  { value: 20, label: "First 20 min" },
  { value: 25, label: "First 25 min" },
  { value: 30, label: "First 30 min" },
  { value: 35, label: "First 35 min" },
  { value: 40, label: "First 40 min" },
  { value: 45, label: "First 45 min" },
  { value: 50, label: "First 50 min" },
  { value: 55, label: "First 55 min" },
  { value: 60, label: "First 60 min" },
  { value: "full", label: "Full Session" },
];

// Main App Component
function App() {
  const {
    isAuthenticated,
    isLoading: authLoading,
    credentials,
    login,
  } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [chartTimeRange, setChartTimeRange] = useState("full"); // Default to full session
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter states
  const [filters, setFilters] = useState({
    site: "all",
    machineType: "all",
    connectorType: "all",
    cpid: "all",
    status: "all",
    voltageArch: "all",
    search: "",
  });

  // Duration filter state (min/max range in minutes)
  const [durationMin, setDurationMin] = useState("");
  const [durationMax, setDurationMax] = useState("");

  // Separate price filter state
  const [priceFilter, setPriceFilter] = useState("all");

  // SOC filter for stats (filter by max starting SOC, "all" = no filter)
  const [socFilter, setSocFilter] = useState("all");

  // Extension filter (min/max range, 0-4)
  const [extensionMin, setExtensionMin] = useState("");
  const [extensionMax, setExtensionMax] = useState("");

  // Date range filter
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Refund filter state
  // refundFilter: "default" = no filter, "all" = show only refunded
  const [refundFilter, setRefundFilter] = useState("default");
  // includeRefunded toggles whether refunded sessions should be included when not using "All Refunded"
  const [includeRefunded, setIncludeRefunded] = useState(false);

  // Performance chart view states: "400V" or "800V"
  const [kwChartView, setKwChartView] = useState("400V");
  const [voltageCurrentChartView, setVoltageCurrentChartView] =
    useState("400V-A"); // "400V-A", "800V-A", "400V-V", "800V-V"

  const [chartInfoData, setChartInfoData] = useState(null); // live hover
  const [lockedChartInfo, setLockedChartInfo] = useState(null); // click-locked

  // Fetch and process data
  const fetchData = useCallback(
    async (username, password) => {
      setLoading(true);
      setError(null);
      setProgress(0);

      const authHeader = "Basic " + btoa(`${username}:${password}`);

      try {
        // Step 1: Fetch mini_view data
        setProgressStatus("Fetching session data...");
        setProgress(10);

        const miniViewRes = await fetch(
          `${API_CONFIG.BASE_URL}/views/mini_view?limit=999999&range=year`,
          {
            headers: { Authorization: authHeader },
          },
        );

        if (!miniViewRes.ok) {
          throw new Error(
            "Authentication failed. Please check your credentials.",
          );
        }

        const miniViewData = await miniViewRes.json();
        // console.log("Raw mini_view data:", miniViewData);
        setProgress(30);

        // Step 2: Fetch EMS transactions
        setProgressStatus("Fetching EMS transactions...");

        const emsRes = await fetch(
          `${API_CONFIG.BASE_URL}/ems_transactions?limit=999999`,
          {
            headers: { Authorization: authHeader },
          },
        );

        if (!emsRes.ok) {
          throw new Error("Failed to fetch EMS data.");
        }

        const emsData = await emsRes.json();
        console.log("Raw EMS data:", emsData);
        setProgress(50);

        // Log EMS data structure to see minuteBuckets
        const emsArray = emsData.rows || emsData || [];
        console.log("EMS transactions loaded:", emsArray.length);
        if (emsArray.length > 0) {
          const keys = Object.keys(emsArray[0]);
          console.log("Sample EMS record keys:", keys.join(", "));
          console.log(
            "Sample EMS record (stringified):",
            JSON.stringify(emsArray[0], null, 2),
          );
        }

        // Step 3: Filter sessions >= 10 minutes
        setProgressStatus("Filtering sessions (≥10 minutes)...");

        const filteredSessions = miniViewData.rows.filter(
          (row) =>
            parseInt(row.duration_minutes) >= 10 && row.final_cost >= 12.5,
        );

        console.log(
          `Sessions with duration >= 10 min: ${filteredSessions.length}`,
          filteredSessions,
        );

        // Log mini_view session structure
        if (filteredSessions.length > 0) {
          console.log(
            "Sample mini_view session keys:",
            Object.keys(filteredSessions[0]).join(", "),
          );
          console.log(
            "Sample mini_view raw_transaction_id:",
            filteredSessions[0].raw_transaction_id,
          );
          console.log(
            "Sample mini_view session_id:",
            filteredSessions[0].session_id,
          );
        }

        setProgress(60);

        // Step 4: Create EMS lookup map (try multiple keys for matching)
        setProgressStatus("Matching transactions...");

        // EMS uses "transaction_id", mini_view uses "raw_transaction_id" - same values, different field names
        const emsMapByTxId = new Map();
        emsArray.forEach((ems) => {
          if (ems.transaction_id) {
            emsMapByTxId.set(ems.transaction_id, ems);
          }
        });

        // Log what IDs we have for matching
        if (emsArray.length > 0) {
          console.log("Sample EMS transaction_id:", emsArray[0].transaction_id);
          console.log("EMS map by TxId size:", emsMapByTxId.size);
        }

        // Count how many EMS records have minute_buckets (snake_case)
        const emsWithBuckets = emsArray.filter(
          (e) => e.minute_buckets && e.minute_buckets.length > 0,
        );
        console.log("EMS records with minute_buckets:", emsWithBuckets.length);

        setProgress(70);

        // Step 5: Merge data and categorize
        setProgressStatus("Processing and categorizing data...");

        const mergedSessions = filteredSessions
          .map((session) => {
            // Match by raw_transaction_id (mini_view) to transaction_id (EMS)
            const ems = emsMapByTxId.get(session.raw_transaction_id);

            const machineInfo = getMachineInfo(
              session.cpid,
              session.connector_id,
            );

            // Calculate SOC gain
            const socStart =
              session.soc_start || ems?.summary?.startSocPercent || 0;
            const socEnd = session.soc_end || ems?.summary?.endSocPercent || 0;
            const socGain = socEnd - socStart;

            // Calculate estimated kWh in 10 min
            const totalKwh = session.total_kwh || ems?.summary?.totalKwh || 0;
            const average_kw =
              session.average_kw || ems?.summary?.averageKw || 0;
            const durationMin = session.duration_minutes || 0;
            const estimatedKwh10Min =
              durationMin > 0 ? (totalKwh / durationMin) * 10 : 0;

            // Get minute_buckets from EMS data (snake_case as per API)
            const rawBuckets = ems?.minute_buckets || [];
            // console.log("Raw minute buckets:", session.session_id, rawBuckets);

            let buckets = [];

            if (Array.isArray(rawBuckets) && rawBuckets.length > 0) {
              buckets = rawBuckets.map((b, i) => ({
                min: b.index ?? i,
                label: b.range || `${String(i).padStart(2, "0")}:00`,
                avgPowerKw: Number(
                  b.avgPowerKw || b.avg_power_kw || b.power || 0,
                ),
                socPercent: Number(b.socPercent || b.soc_percent || b.soc || 0),
                avgCurrentA: Number(
                  b.avgCurrentA || b.avg_current_a || b.current || 0,
                ),
                avgVoltageV: Number(
                  b.avgVoltageV || b.avg_voltage_v || b.voltage || 0,
                ),
                durationSec: Number(b.durationSec || b.duration_sec || 60),
              }));
            }

            // Calculate voltage architecture (400V or 800V) based on average voltage
            let avgVoltage = 0;
            let avgCurrent = 0;
            if (buckets.length > 0) {
              const voltageSum = buckets.reduce(
                (sum, b) => sum + (b.avgVoltageV || 0),
                0,
              );
              const currentSum = buckets.reduce(
                (sum, b) => sum + (b.avgCurrentA || 0),
                0,
              );
              avgVoltage = voltageSum / buckets.length;
              avgCurrent = currentSum / buckets.length;
            }

            // If average voltage > 600V, it's an 800V architecture, otherwise 400V
            const voltageArch =
              !buckets.length > 0
                ? session.cpid === "MBS_1" && session.average_kw > 100
                  ? "800V"
                  : "400V"
                : avgVoltage > 600
                  ? "800V"
                  : "400V";

            // Calculate kWh for first 10 minutes from minute_buckets
            // Each bucket is 1 minute, kWh = avgPowerKw * (1/60) per minute
            let kwh10Min = 0;

            if (parseInt(durationMin) === 10) {
              // For sessions exactly 10 minutes: use total energy as 10-min energy
              kwh10Min = totalKwh;
            } else if (parseInt(durationMin) > 10) {
              // For sessions > 10 minutes: sum first 10 buckets + half of 11th minute
              const first10Buckets = buckets.slice(0, 10);
              kwh10Min = first10Buckets.reduce((sum, b) => {
                // Power in kW * time in hours (1 min = 1/60 hour)
                return sum + (b.avgPowerKw || 0) * (1 / 60);
              }, 0);

              // Add half of the 11th minute's energy (if available)
              // 11th minute is at index 10
              if (buckets.length > 10) {
                const eleventhMinutePower = buckets[10]?.avgPowerKw || 0;
                // Half minute energy = (power / 2) * (1/60) = power / 120
                const halfMinuteKwh = eleventhMinutePower / 2 / 60;
                // kwh10Min += halfMinuteKwh;
              }
            } else {
              // For sessions < 10 minutes: calculate from available buckets
              const availableBuckets = buckets.slice(
                0,
                Math.min(10, buckets.length),
              );
              kwh10Min = availableBuckets.reduce((sum, b) => {
                return sum + (b.avgPowerKw || 0) * (1 / 60);
              }, 0);
            }

            // Calculate kW for first 10 minutes from minute_buckets
            // Each bucket is 1 minute, kW = sum(avgPowerKw)/10 per minute
            let kw10Min = 0;

            if (parseInt(durationMin) === 10) {
              // For sessions exactly 10 minutes: use total energy as 10-min energy
              kw10Min = average_kw;
            } else if (parseInt(durationMin) > 10) {
              // For sessions > 10 minutes: sum first 10 buckets + half of 11th minute
              const first10Buckets = buckets.slice(0, 10);
              kw10Min =
                first10Buckets.reduce(
                  (sum, b) => sum + (b.avgPowerKw || 0),
                  0,
                ) / first10Buckets.length;

              // Add half of the 11th minute's energy (if available)
              // 11th minute is at index 10
              if (buckets.length > 10) {
                const eleventhMinutePower = buckets[10]?.avgPowerKw || 0;
                const halfMinuteKw = eleventhMinutePower / 2;
                // kw10Min += halfMinuteKw;
              }
            } else {
              // For sessions < 10 minutes: calculate from available buckets
              const availableBuckets = buckets.slice(
                0,
                Math.min(10, buckets.length),
              );
              kw10Min =
                availableBuckets.reduce(
                  (sum, b) => sum + (b.avgPowerKw || 0),
                  0,
                ) / availableBuckets.length;
            }

            // Calculate SOC change in first 10 minutes
            const first10BucketsForSoc = buckets.slice(0, 10);
            let soc10MinStart = socStart;
            let soc10MinEnd = socStart;

            if (parseInt(durationMin) === 10) {
              // For sessions exactly 10 minutes: use total energy as 10-min energy
              soc10MinStart = socStart;
              soc10MinEnd = socEnd;
            }

            if (first10BucketsForSoc.length > 0) {
              // Get SOC at start (first bucket) and end (last of first 10)
              soc10MinStart = first10BucketsForSoc[0]?.socPercent || socStart;
              soc10MinEnd =
                first10BucketsForSoc[first10BucketsForSoc.length - 1]
                  ?.socPercent || soc10MinStart;
            }

            const soc10MinGain = soc10MinEnd - soc10MinStart;

            // Log first session to debug
            if (filteredSessions.indexOf(session) === 0) {
              console.log("=== DEBUG: First Session ===");
              console.log("Session ID:", session.session_id);
              console.log("raw_transaction_id:", session.raw_transaction_id);
              console.log("EMS match found:", !!ems);
              console.log(
                "EMS minute_buckets:",
                ems?.minute_buckets?.length || 0,
              );
              console.log("Processed buckets:", buckets.length);
              console.log(
                "Avg Voltage:",
                avgVoltage.toFixed(1),
                "-> Architecture:",
                voltageArch,
              );
              console.log("First 10 min kWh:", kwh10Min.toFixed(2));
              console.log("First 10 min SOC gain:", soc10MinGain);
            }

            // Calculate extensions (base is 10 minutes, each extension is 5 minutes)
            const baseDuration = durationMin;
            const extensionMinutes = Number(session.extension_minutes) || 0;
            const extensionCount = Number(session.extensions_count) || 0;

            // console.log(
            //   `Session ${session.session_id}: duration ${durationMin} min, extensions ${extensionMinutes} min (${extensionCount} count)`,
            // );

            return {
              session_id: session.session_id?.slice(0, 8) || "N/A",
              full_id: session.session_id || "N/A",
              raw_transaction_id: session.raw_transaction_id,
              ...machineInfo,
              cpid: session.cpid || "unknown",
              connector_id: session.connector_id || 0,
              duration_minutes: durationMin,
              base_duration: baseDuration,
              extension_minutes: extensionMinutes,
              extension_count: extensionCount,
              soc_start: socStart,
              soc_end: socEnd,
              soc_gain: socGain,
              total_kwh: totalKwh,
              average_kw: average_kw,
              estimated_kwh_10_min: estimatedKwh10Min,
              final_cost: session.final_cost || 0,
              status: session.status || "unknown",
              ems_site:
                ems?.ems_site ||
                session.ems_site ||
                "hc-mbs (Without EMS Bucket Data)",
              start_time: session.start_time || ems?.ems_start_time_utc || "",
              end_time: session.end_time || ems?.ems_end_time_utc || "",
              participant_label: session.participant_label || "N/A",
              user_full_name: session.user_full_name || "N/A",
              ev_capacity_kwh: session.ev_capacity_kwh || 0,
              buckets: buckets,
              // New fields
              voltage_arch: voltageArch,
              avg_voltage: avgVoltage,
              avg_current: avgCurrent,
              kwh_10_min: kwh10Min,
              kw_10_min: kw10Min,
              soc_10_min_start: soc10MinStart,
              soc_10_min_end: soc10MinEnd,
              soc_10_min_gain: soc10MinGain,
              // refunded
              is_refunded: session.is_refunded,
              // session note
              session_note: session.session_note || "",
            };
          })
          // Remove rows with NaN SOC gain or 0 estimated_kwh_10_min
          .filter((session) => {
            const validSocGain =
              !isNaN(session.soc_gain) && session.soc_gain !== null;
            const validKwh = session.estimated_kwh_10_min > 0;
            return validSocGain;
          });

        setProgress(90);

        // Log how many sessions have chart data
        const sessionsWithBuckets = mergedSessions.filter(
          (s) => s.buckets && s.buckets.length > 0,
        );

        console.log(
          `Sessions with chart data: ${sessionsWithBuckets.length} / ${mergedSessions.length}`,
        );
        if (sessionsWithBuckets.length > 0) {
          console.log(
            "Sample session with buckets:",
            sessionsWithBuckets[0].session_id,
            "has",
            sessionsWithBuckets[0].buckets.length,
            "data points",
          );
        }

        // Step 6: Sort by start time (newest first)
        setProgressStatus("Finalizing...");

        sessionsWithBuckets.sort(
          (a, b) => new Date(b.start_time) - new Date(a.start_time),
        );

        // console.log("Total sessions after processing:", sessionsWithBuckets);

        setProgress(100);
        setData(sessionsWithBuckets);
        login(username, password);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [login],
  );

  // Handle login
  const handleLogin = (username, password) => {
    fetchData(username, password);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchData(credentials.username, credentials.password);
  };

  // Auto-fetch data when returning to dashboard if authenticated but no data
  useEffect(() => {
    if (
      isAuthenticated &&
      credentials.username &&
      data.length === 0 &&
      !loading
    ) {
      fetchData(credentials.username, credentials.password);
    }
  }, [isAuthenticated, credentials, data.length, loading, fetchData]);

  // Filter options
  const filterOptions = useMemo(() => {
    const sites = [...new Set(data.map((d) => d.ems_site))]
      .filter(Boolean)
      .sort();
    console.log("Available sites for filtering:", sites);
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

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter((session) => {
      if (filters.site !== "all" && session.ems_site !== filters.site)
        return false;
      if (
        filters.machineType !== "all" &&
        session.machine_type !== filters.machineType
      )
        return false;
      if (
        filters.connectorType !== "all" &&
        session.connector_type !== filters.connectorType
      )
        return false;
      if (filters.cpid !== "all" && session.cpid !== filters.cpid) return false;
      if (filters.status !== "all" && session.status !== filters.status)
        return false;
      // Duration filter - min/max range
      const sessionMins = session.duration_minutes || 0;
      if (durationMin !== "" && sessionMins < Number(durationMin)) return false;
      if (durationMax !== "" && sessionMins > Number(durationMax)) return false;

      if (
        filters.voltageArch !== "all" &&
        session.voltage_arch !== filters.voltageArch
      )
        return false;
      // Price filter - only apply when not "all"
      if (priceFilter !== "all") {
        const sessionPrice = session.final_cost || 0;
        const filterPrice = Number(priceFilter);
        // Round both to 2 decimal places for accurate comparison
        if (Number(sessionPrice.toFixed(2)) !== Number(filterPrice.toFixed(2)))
          return false;
      }
      // Max Start SOC filter - only show sessions with soc_start <= filter value
      if (socFilter !== "all") {
        const sessionSocStart = session.soc_start || 0;
        if (sessionSocStart > Number(socFilter)) return false;
      }
      // Extension filter - min/max range
      const sessionExtensions = session.extension_count || 0;
      // console.log(
      //   `Filtering session ${session.session_id}: extensions ${sessionExtensions} (min: ${extensionMin}, max: ${extensionMax})`,
      // );
      if (extensionMin !== "" && sessionExtensions < Number(extensionMin))
        return false;
      if (extensionMax !== "" && sessionExtensions > Number(extensionMax))
        return false;

      // Refund filters
      const isRefunded = session.is_refunded;
      // console.log("SEOP:", session);
      if (refundFilter === "all") {
        // only show refunded sessions
        if (!isRefunded) return false;
      } else {
        // default behaviour is to exclude refunded unless user opts in
        if (!includeRefunded && isRefunded) return false;
      }

      // Date range filter
      if (startDate || endDate) {
        const sessionDate = session.start_time
          ? new Date(session.start_time)
          : null;
        console.log(
          `Filtering session ${session.session_id}: sessionDate=${sessionDate}, startDate=${startDate}, endDate=${endDate}`,
        );
        if (!sessionDate) return false;

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (sessionDate < start) return false;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (sessionDate > end) return false;
        }
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          session.session_id.toLowerCase().includes(search) ||
          session.cpid.toLowerCase().includes(search) ||
          session.participant_label?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [
    data,
    filters,
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
  ]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters,
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
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Stats
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const totalKwh = filteredData.reduce((sum, s) => sum + s.total_kwh, 0);
    const avgDuration =
      filteredData.reduce((sum, s) => sum + s.duration_minutes, 0) /
      filteredData.length;
    const avgSocGain =
      filteredData.reduce((sum, s) => sum + s.soc_gain, 0) /
      filteredData.length;
    const avgPower =
      filteredData.reduce((sum, s) => sum + s.average_kw, 0) /
      filteredData.length;
    const totalRevenue = filteredData.reduce((sum, s) => sum + s.final_cost, 0);

    // Stats by voltage architecture
    const sessions400V = filteredData.filter((s) => s.voltage_arch === "400V");
    const sessions800V = filteredData.filter((s) => s.voltage_arch === "800V");

    console.log("Sessions by voltage architecture:", sessions400V);

    // Stats by machine type
    const sessionsMBS1 = filteredData.filter((s) => s.cpid === "MBS_1");
    const sessionsMBS2 = filteredData.filter((s) => s.cpid === "MBS_2");

    // Machine + Voltage architecture combinations
    const sessionsMBS1_400V = sessionsMBS1.filter(
      (s) => s.voltage_arch === "400V",
    );
    const sessionsMBS1_800V = sessionsMBS1.filter(
      (s) => s.voltage_arch === "800V",
    );
    const sessionsMBS2_400V = sessionsMBS2.filter(
      (s) => s.voltage_arch === "400V",
    );
    const sessionsMBS2_800V = sessionsMBS2.filter(
      (s) => s.voltage_arch === "800V",
    );

    const avgKwh = (sessions) => {
      let total = 0;
      let count = 0;

      // console.log(`Calculating average kWh for ${sessions.length} sessions...`);

      sessions.forEach((s) => {
        // If bucket data exists
        if (s.buckets && s.buckets.length > 0) {
          const kwh =
            s.buckets.reduce((sum, b) => sum + (b.avgPowerKw || 0), 0) / 60;

          if (kwh > 0) {
            total += kwh;
            count++;
          }
        }

        // Fallback to stored value
        else if (s.total_kwh > 0) {
          // console.log(
          //   `Session ${s.duration_minutes} has no bucket data, using kwh_10_min: ${s.kwh_10_min.toFixed(2)} kWh`,
          // );
          total += s.total_kwh;
          count++;
        }
      });

      return count ? total / count : 0;
    };

    const avgSocGainFn = (sessions) => {
      let total = 0;
      let count = 0;

      sessions.forEach((s) => {
        // If bucket exists
        if (s.buckets && s.buckets.length > 0) {
          const start = s.buckets[0]?.socPercent;
          const end = s.buckets[s.buckets.length - 1]?.socPercent;

          if (start != null && end != null) {
            total += end - start;
            count++;
          }
        }

        // Fallback
        else if (!isNaN(s.soc_gain) && s.soc_gain !== null) {
          total += s.soc_gain;
          count++;
        }
      });

      return count ? total / count : 0;
    };

    const avgPowerFn = (sessions) => {
      let total = 0;
      let count = 0;

      sessions.forEach((s) => {
        // If bucket exists
        if (s.buckets && s.buckets.length > 0) {
          const avgKw =
            s.buckets.reduce((sum, b) => sum + (b.avgPowerKw || 0), 0) /
            s.buckets.length;

          if (avgKw > 0) {
            total += avgKw;
            count++;
          }
        }

        // Fallback
        else if (s.average_kw > 0) {
          total += s.average_kw;
          count++;
        }
      });

      return count ? total / count : 0;
    };

    const avgSocGain400V = avgSocGainFn(sessions400V);
    const avgSocGain800V = avgSocGainFn(sessions800V);

    const avg10MinStats = (sessions) => {
      let totalKwh = 0;
      let totalKw = 0;
      let totalSoc = 0;
      let count = 0;

      console.log("sessions length for avg10MinStats:", sessions.length);

      sessions.forEach((s) => {
        // CASE 1: bucket data available
        if (s.buckets && s.buckets.length > 0) {
          const first10 = s.buckets.slice(0, 10);

          if (first10.length > 0) {
            const sumKw = first10.reduce(
              (sum, b) => sum + (b.avgPowerKw || 0),
              0,
            );

            const avgKw = sumKw / first10.length;
            const kwh = sumKw / 60;

            console.log(
              `Session ${s.session_id}: First 10 min avg power = ${avgKw.toFixed(
                2,
              )} kW, kWh = ${kwh.toFixed(2)}`,
            );

            const socStart = first10[0]?.socPercent;
            const socEnd = first10[first10.length - 1]?.socPercent;
            const socGain = socEnd - socStart;

            totalKw += avgKw;
            totalKwh += kwh;
            totalSoc += socGain;
            count++;
          }
        }

        // CASE 2: NO bucket data → only exact 10 minute sessions
        else if (s.duration_minutes === 10) {
          const kwh = s.total_kwh || 0;
          const kw = s.average_kw || 0;
          const socGain =
            s.soc_gain ??
            (s.soc_end != null && s.soc_start != null
              ? s.soc_end - s.soc_start
              : 0);

          if (kw > 0 && kwh > 0) {
            totalKw += kw;
            totalKwh += kwh;
            totalSoc += socGain;
            count++;
          }
        }
      });

      console.log(
        "avgKwh:",
        totalKwh,
        "avgKw:",
        totalKw,
        "avgSoc:",
        totalSoc,
        "count:",
        count,
      );

      return {
        avgKw: count ? totalKw / count : 0,
        avgKwh: count ? totalKwh / count : 0,
        avgSoc: count ? totalSoc / count : 0,
      };
    };

    const avgPower400V = avgPowerFn(sessions400V);
    const avgPower800V = avgPowerFn(sessions800V);

    const avgKwhByDurations = avgKwh(filteredData);
    const avgKwh400V = avgKwh(sessions400V);
    const avgKwh800V = avgKwh(sessions800V);
    const avgKwhMBS1 = avgKwh(sessionsMBS1);
    const avgKwhMBS2 = avgKwh(sessionsMBS2);
    const avgKwhMBS1_400V = avgKwh(sessionsMBS1_400V);
    const avgKwhMBS1_800V = avgKwh(sessionsMBS1_800V);
    const avgKwhMBS2_400V = avgKwh(sessionsMBS2_400V);
    const avgKwhMBS2_800V = avgKwh(sessionsMBS2_800V);

    const stats10All = avg10MinStats(filteredData);
    const stats10_400V = avg10MinStats(sessions400V);
    const stats10_800V = avg10MinStats(sessions800V);
    console.log(
      "Stats for all sessions with 10-min bucket data:",
      stats10_400V,
    );

    const stats10_MBS1 = avg10MinStats(sessionsMBS1);
    const stats10_MBS2 = avg10MinStats(sessionsMBS2);

    // Counts
    const count400V = sessions400V.length;
    const count800V = sessions800V.length;
    const countMBS1 = sessionsMBS1.length;
    const countMBS2 = sessionsMBS2.length;
    const socFilteredCount = filteredData.length;

    // Extension stats
    const totalExtensions = filteredData.reduce(
      (sum, s) => sum + (s.extension_count || 0),
      0,
    );
    const avgExtensions =
      filteredData.length > 0 ? totalExtensions / filteredData.length : 0;
    const totalBaseDuration = filteredData.reduce(
      (sum, s) => sum + (s.base_duration || 10),
      0,
    );
    const totalExtensionMinutes = filteredData.reduce(
      (sum, s) => sum + (s.extension_minutes || 0),
      0,
    );

    return {
      count: filteredData.length,
      totalKwh: totalKwh.toFixed(1),
      avgDuration: avgDuration.toFixed(0),
      avgSocGain: avgSocGain.toFixed(1),
      avgPower: avgPower.toFixed(1),
      totalRevenue: totalRevenue.toFixed(2),
      // SOC filtered stats
      socFilteredCount,
      avgKwhByDurations: avgKwhByDurations.toFixed(2),
      avgKwh400V: avgKwh400V.toFixed(2),
      avgKwh800V: avgKwh800V.toFixed(2),
      avgKwhMBS1: avgKwhMBS1.toFixed(2),
      avgKwhMBS2: avgKwhMBS2.toFixed(2),
      avgKwhMBS1_400V: avgKwhMBS1_400V.toFixed(2),
      avgKwhMBS1_800V: avgKwhMBS1_800V.toFixed(2),
      avgKwhMBS2_400V: avgKwhMBS2_400V.toFixed(2),
      avgKwhMBS2_800V: avgKwhMBS2_800V.toFixed(2),
      avgSocGain400V: avgSocGain400V.toFixed(1),
      avgSocGain800V: avgSocGain800V.toFixed(1),
      avgPower400V: avgPower400V.toFixed(1),
      avgPower800V: avgPower800V.toFixed(1),
      avgKwh10MinAll: stats10All.avgKwh.toFixed(2),
      avgPower10MinAll: stats10All.avgKw.toFixed(1),
      avgSocGain10MinAll: stats10All.avgSoc.toFixed(1),

      avgKwh10Min400V: stats10_400V.avgKwh.toFixed(2),
      avgPower10Min400V: stats10_400V.avgKw.toFixed(1),
      avgSocGain10Min400V: stats10_400V.avgSoc.toFixed(1),

      avgKwh10Min800V: stats10_800V.avgKwh.toFixed(2),
      avgPower10Min800V: stats10_800V.avgKw.toFixed(1),
      avgSocGain10Min800V: stats10_800V.avgSoc.toFixed(1),

      avgKwh10MinMBS1: stats10_MBS1.avgKwh.toFixed(2),
      avgPower10MinMBS1: stats10_MBS1.avgKw.toFixed(1),
      avgSocGain10MinMBS1: stats10_MBS1.avgSoc.toFixed(1),

      avgKwh10MinMBS2: stats10_MBS2.avgKwh.toFixed(2),
      avgPower10MinMBS2: stats10_MBS2.avgKw.toFixed(1),
      avgSocGain10MinMBS2: stats10_MBS2.avgSoc.toFixed(1),

      count400V,
      count800V,
      countMBS1,
      countMBS2,
      countMBS1_400V: sessionsMBS1_400V.length,
      countMBS1_800V: sessionsMBS1_800V.length,
      countMBS2_400V: sessionsMBS2_400V.length,
      countMBS2_800V: sessionsMBS2_800V.length,
      ratio400V:
        socFilteredCount > 0
          ? ((count400V / socFilteredCount) * 100).toFixed(0)
          : 0,
      ratio800V:
        socFilteredCount > 0
          ? ((count800V / socFilteredCount) * 100).toFixed(0)
          : 0,
      // Extension stats
      totalExtensions,
      avgExtensions: avgExtensions.toFixed(1),
      totalBaseDuration,
      totalExtensionMinutes,
    };
  }, [filteredData]);

  // Performance chart data - sessions with bucket data only
  const performanceChartData = useMemo(() => {
    // Filter sessions that have bucket data
    const sessionsWithBuckets = filteredData.filter(
      (s) => s.buckets && s.buckets.length >= 10,
    );

    // Separate by voltage architecture
    const sessions400V = sessionsWithBuckets.filter(
      (s) => s.voltage_arch === "400V",
    );
    const sessions800V = sessionsWithBuckets.filter(
      (s) => s.voltage_arch === "800V",
    );

    // Generate colors for individual sessions
    const generateColors = (count) => {
      const colors = [];
      for (let i = 0; i < count; i++) {
        const hue = (i * 137.508) % 360; // Golden angle for distribution
        colors.push(`hsl(${hue}, 60%, 50%)`);
      }
      return colors;
    };

    const processChartData = (sessions, dataKey) => {
      if (sessions.length === 0) return { chartData: [], sessionCount: 0 };

      const colors = generateColors(sessions.length);
      const maxMinutes = Math.max(
        ...sessions.map((s) => (s.buckets ? s.buckets.length : 0)),
      );
      const chartData = [];

      for (let minute = 0; minute < maxMinutes; minute++) {
        const dataPoint = { minute: minute + 1 };
        const values = [];

        sessions.forEach((session, idx) => {
          const bucket = session.buckets?.[minute];
          if (bucket) {
            const value = bucket[dataKey] ?? 0;
            values.push(value);
            // Always store ALL sessions for tooltip, regardless of count
            dataPoint[`session_${idx}`] = value;
            dataPoint[`id_${idx}`] = session.session_id ?? `Session ${idx + 1}`;
            dataPoint[`color_${idx}`] = colors[idx];
          }
        });

        if (values.length > 0) {
          const sorted = [...values].sort((a, b) => a - b);
          const pct = (p) => {
            const i = (p / 100) * (sorted.length - 1);
            const lo = Math.floor(i);
            const hi = Math.ceil(i);
            return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
          };
          dataPoint.average = values.reduce((a, b) => a + b, 0) / values.length;
          dataPoint.median = pct(50);
          dataPoint.band_outer_base = pct(10);
          dataPoint.band_outer_delta = pct(90) - pct(10);
          dataPoint.band_inner_base = pct(25);
          dataPoint.band_inner_delta = pct(75) - pct(25);
        } else {
          dataPoint.average = dataPoint.median = 0;
          dataPoint.band_outer_base = dataPoint.band_outer_delta = 0;
          dataPoint.band_inner_base = dataPoint.band_inner_delta = 0;
        }

        chartData.push(dataPoint);
      }

      return { chartData, sessionCount: sessions.length, colors };
    };

    return {
      kw400V: processChartData(sessions400V, "avgPowerKw"),
      kw800V: processChartData(sessions800V, "avgPowerKw"),
      current400V: processChartData(sessions400V, "avgCurrentA"),
      current800V: processChartData(sessions800V, "avgCurrentA"),
      voltage400V: processChartData(sessions400V, "avgVoltageV"),
      voltage800V: processChartData(sessions800V, "avgVoltageV"),
      count400V: sessions400V.length,
      count800V: sessions800V.length,
    };
  }, [filteredData]);

  // // Reset chart info panel when performanceChartData updates
  // useEffect(() => {
  //   setChartInfoData(null);
  // }, [performanceChartData]);

  // Chart data for selected session - use only real API data
  const chartData = useMemo(() => {
    if (!selectedSession) return [];

    // Only use real data from API - no synthetic data
    const allData =
      selectedSession.buckets && selectedSession.buckets.length > 0
        ? selectedSession.buckets
        : [];

    // Apply time range filter
    let filteredBuckets = allData;
    if (chartTimeRange !== "full" && allData.length > 0) {
      filteredBuckets = allData.slice(0, chartTimeRange);
    }

    // Add cumulative kWh to each bucket
    let cumulativeKwh = 0;
    return filteredBuckets.map((bucket, index) => {
      // kWh for this minute = avgPowerKw * (1/60) hour
      const minuteKwh = (bucket.avgPowerKw || 0) * (1 / 60);
      cumulativeKwh += minuteKwh;
      return {
        ...bucket,
        minuteKwh: +minuteKwh.toFixed(3),
        cumulativeKwh: +cumulativeKwh.toFixed(2),
      };
    });
  }, [selectedSession, chartTimeRange]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      site: "all",
      machineType: "all",
      connectorType: "all",
      cpid: "all",
      status: "all",
      voltageArch: "all",
      search: "",
    });
    // clear any range filters as well
    setDurationMin("");
    setDurationMax("");
    setPriceFilter("all");
    setSocFilter("all");
    setExtensionMin("");
    setExtensionMax("");
    setRefundFilter("default");
    setIncludeRefunded(false);
    setStartDate("");
    setEndDate("");
  };

  // Download CSV function
  const downloadCSV = () => {
    const dataToExport = filteredData;
    if (dataToExport.length === 0) {
      alert("No data to export");
      return;
    }

    // Define CSV headers matching the session details
    const headers = [
      "Session ID",
      "User",
      "Site",
      "Machine Type",
      "Connector Type",
      "Start Time",
      "End Time",
      "Duration (min)",
      "Extensions",
      "Extension Minutes",
      "Status",
      "SOC Start (%)",
      "SOC End (%)",
      "SOC Gain (%)",
      "Total Energy (kWh)",
      "Avg Power (kW)",
      "Cost ($)",
      "Architecture",
      "10-Min Energy (kWh)",
      "10-Min Power (kW)",
      "10-Min SOC (%)",
      "Avg Voltage (V)",
      "Avg Current (A)",
      "Is Refunded",
    ];

    // Convert data to CSV rows
    const csvRows = dataToExport.map((session) => {
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleString();
      };

      return [
        session.full_id || "",
        session.user_full_name || "",
        session.ems_site || "",
        session.machine_type || "",
        session.connector_type || "",
        formatDate(session.start_time),
        formatDate(session.end_time),
        session.duration_minutes || 0,
        session.extension_count || 0,
        session.extension_minutes || 0,
        session.status || "",
        session.soc_start || 0,
        session.soc_end || 0,
        session.soc_gain || 0,
        (session.total_kwh || 0).toFixed(2),
        (session.average_kw || 0).toFixed(2),
        (session.final_cost || 0).toFixed(2),
        session.voltage_arch || "",
        (session.kwh_10_min || 0).toFixed(2),
        (session.kw_10_min || 0).toFixed(2),
        (session.soc_10_min_gain || 0).toFixed(0),
        (session.avg_voltage || 0).toFixed(1),
        (session.avg_current || 0).toFixed(1),
        session.is_refunded ? "Yes" : "No",
      ];
    });

    // Escape CSV values
    const escapeCSV = (value) => {
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...csvRows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ev-sessions-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Loading state while checking stored credentials
  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <>
        <LoginForm onLogin={handleLogin} loading={loading} />
        {error && (
          <div className="error-toast">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <h1>Session Dashboard</h1>
          <p className="header-subtitle">MBS Charging Station Analytics</p>
        </div>
        <div className="header-right">
          <button className="refresh-btn-header" onClick={handleRefresh}>
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
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="filters-section">
        <div className="filters-header">
          <h2>Filters</h2>
          <div className="filters-actions">
            <button className="download-csv-btn" onClick={downloadCSV}>
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
              Download CSV
            </button>
            <button className="reset-filters-btn" onClick={resetFilters}>
              Clear All
            </button>
          </div>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Site</label>
            <select
              value={filters.site}
              onChange={(e) => updateFilter("site", e.target.value)}
            >
              <option value="all">All Sites</option>
              {filterOptions.sites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Machine</label>
            <select
              value={filters.machineType}
              onChange={(e) => updateFilter("machineType", e.target.value)}
            >
              <option value="all">All Machines</option>
              {filterOptions.machineTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Connector</label>
            <select
              value={filters.connectorType}
              onChange={(e) => updateFilter("connectorType", e.target.value)}
            >
              <option value="all">All Connectors</option>
              {filterOptions.connectorTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {/* <div className="filter-group">
            <label>Charger</label>
            <select
              value={filters.cpid}
              onChange={(e) => updateFilter("cpid", e.target.value)}
            >
              <option value="all">All Chargers</option>
              {filterOptions.cpids.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div> */}
          {/* <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              <option value="all">All Status</option>
              {filterOptions.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div> */}
          <div className="filter-group">
            <label>EV Battery Architecture</label>
            <select
              value={filters.voltageArch}
              onChange={(e) => updateFilter("voltageArch", e.target.value)}
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
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
                placeholder="Start"
              />
              <span className="range-separator">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
                placeholder="End"
              />
              {(startDate || endDate) && (
                <button
                  className="range-clear-btn"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  title="Clear"
                >
                  ×
                </button>
              )}
            </div>
          </div>

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
                  setDurationMin(
                    e.target.value === ""
                      ? ""
                      : Math.max(0, Number(e.target.value)),
                  )
                }
                className="range-input"
              />
              <span className="range-separator">–</span>
              <input
                type="number"
                min="0"
                max="300"
                value={durationMax}
                placeholder="Max"
                onChange={(e) =>
                  setDurationMax(
                    e.target.value === ""
                      ? ""
                      : Math.max(0, Number(e.target.value)),
                  )
                }
                className="range-input"
              />
              {(durationMin !== "" || durationMax !== "") && (
                <button
                  className="range-clear-btn"
                  onClick={() => {
                    setDurationMin("");
                    setDurationMax("");
                  }}
                  title="Clear"
                >
                  ×
                </button>
              )}
            </div>
          </div>

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
                  setPriceFilter(Number(newVal.toFixed(2)));
                }}
                disabled={priceFilter !== "all" && Number(priceFilter) <= 0}
              >
                −
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
                      setPriceFilter("all");
                    } else {
                      const val = Math.min(
                        100,
                        Math.max(0, Number(inputVal) || 0),
                      );
                      setPriceFilter(Number(val.toFixed(2)));
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
                  setPriceFilter(Number(newVal.toFixed(2)));
                }}
                disabled={priceFilter !== "all" && Number(priceFilter) >= 100}
              >
                +
              </button>
              {priceFilter !== "all" && (
                <button
                  className="price-btn clear"
                  onClick={() => setPriceFilter("all")}
                  title="Clear price filter"
                >
                  ×
                </button>
              )}
            </div>
          </div>
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
                  setSocFilter(newVal);
                }}
                disabled={socFilter !== "all" && Number(socFilter) <= 5}
              >
                −
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
                      setSocFilter("all");
                    } else {
                      const val = Math.min(
                        100,
                        Math.max(5, Number(inputVal) || 5),
                      );
                      setSocFilter(val);
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
                  setSocFilter(newVal);
                }}
                disabled={socFilter !== "all" && Number(socFilter) >= 100}
              >
                +
              </button>
              {socFilter !== "all" && (
                <button
                  className="soc-btn clear"
                  onClick={() => setSocFilter("all")}
                  title="Clear SOC filter"
                >
                  ×
                </button>
              )}
            </div>
          </div>
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
                  setExtensionMin(
                    e.target.value === ""
                      ? ""
                      : Math.max(0, Number(e.target.value)),
                  )
                }
                className="range-input"
              />
              <span className="range-separator">–</span>
              <input
                type="number"
                min="0"
                max="10"
                value={extensionMax}
                placeholder="Max"
                onChange={(e) =>
                  setExtensionMax(
                    e.target.value === ""
                      ? ""
                      : Math.max(0, Number(e.target.value)),
                  )
                }
                className="range-input"
              />
              {(extensionMin !== "" || extensionMax !== "") && (
                <button
                  className="range-clear-btn"
                  onClick={() => {
                    setExtensionMin("");
                    setExtensionMax("");
                  }}
                  title="Clear"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Refund filter group */}
          <div
            className={`filter-group refund-filter ${refundFilter !== "default" || includeRefunded ? "active" : ""}`}
          >
            <label>Refund</label>
            <div className="refund-controls">
              <select
                value={refundFilter}
                onChange={(e) => setRefundFilter(e.target.value)}
              >
                <option value="default">Default</option>
                <option value="all">All Refunded</option>
              </select>
            </div>
          </div>
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
                onChange={(e) => setIncludeRefunded(e.target.checked)}
              />
              <span style={{ marginLeft: "5px" }}>
                Include Refunded Sessions
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="stats-dashboard">
          {/* Overview Row */}
          <div className="stats-row">
            {/* Sessions Summary */}
            <div className="stat-card primary">
              <div className="stat-header">
                <span className="stat-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                </span>
                <span className="stat-label">Sessions</span>
              </div>
              <div className="stat-main-value">{stats.socFilteredCount}</div>
              <div className="stat-sub arch-breakdown">
                <div className="arch-stat">
                  <span className="arch-count">{stats.count400V} × 400V</span>
                  <span className="arch-percent">{stats.ratio400V}%</span>
                </div>
                <div className="arch-stat accent">
                  <span className="arch-count">{stats.count800V} × 800V</span>
                  <span className="arch-percent">{stats.ratio800V}%</span>
                </div>
              </div>
            </div>

            {/* Architecture Performance */}
            <div className="stat-card wide">
              <div className="stat-header">
                <span className="stat-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </span>
                <span className="stat-label">
                  Performance by EV's Battery Architecture (Overall)
                </span>
              </div>
              <div className="stat-table">
                <div className="stat-table-row header">
                  <span></span>
                  <span>Avg Energy</span>
                  <span>Avg SOC Gain</span>
                  <span>Avg Power</span>
                </div>
                <div className="stat-table-row">
                  <span className="arch-label">400V</span>
                  <span className="value">{stats.avgKwh400V} kWh</span>
                  <span className="value">{stats.avgSocGain400V}%</span>
                  <span className="value">{stats.avgPower400V} kW</span>
                </div>
                <div className="stat-table-row highlight">
                  <span className="arch-label accent">800V</span>
                  <span className="value accent">{stats.avgKwh800V} kWh</span>
                  <span className="value accent">{stats.avgSocGain800V}%</span>
                  <span className="value accent">{stats.avgPower800V} kW</span>
                </div>
              </div>
            </div>

            <div className="stat-card wide">
              <div className="stat-header">
                <span className="stat-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </span>
                <span className="stat-label">
                  Performance by EV's Battery Architecture (10-Min Overall)
                </span>
              </div>
              <div className="stat-table">
                <div className="stat-table-row header">
                  <span></span>
                  <span>Avg Energy</span>
                  <span>Avg SOC Gain</span>
                  <span>Avg Power</span>
                </div>
                <div className="stat-table-row">
                  <span className="arch-label">400V</span>
                  <span className="value">{stats.avgKwh10Min400V} kWh</span>
                  <span className="value">{stats.avgSocGain10Min400V}%</span>
                  <span className="value">{stats.avgPower10Min400V} kW</span>
                </div>
                <div className="stat-table-row highlight">
                  <span className="arch-label accent">800V</span>
                  <span className="value accent">
                    {stats.avgKwh10Min800V} kWh
                  </span>
                  <span className="value accent">
                    {stats.avgSocGain10Min800V}%
                  </span>
                  <span className="value accent">{stats.avgPower800V} kW</span>
                </div>
              </div>
            </div>

            {/* <div className="stat-card wide">
              <div className="stat-header">
                <span className="stat-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </span>
                <span className="stat-label">Performance for 10-Mins</span>
              </div>
              <div className="stat-table">
                <div className="stat-table-row header">
                  <span></span>
                  <span>Energy</span>
                  <span>SOC Gain</span>
                  <span>Avg Power</span>
                </div>
                <div className="stat-table-row">
                  <span className="arch-label">400V</span>
                  <span className="value">{stats.avgKwh400V} kWh</span>
                  <span className="value">{stats.avgSocGain400V}%</span>
                  <span className="value">{stats.avgPower400V} kW</span>
                </div>
                <div className="stat-table-row highlight">
                  <span className="arch-label accent">800V</span>
                  <span className="value accent">{stats.avgKwh800V} kWh</span>
                  <span className="value accent">{stats.avgSocGain800V}%</span>
                  <span className="value accent">{stats.avgPower800V} kW</span>
                </div>
              </div>
            </div> */}

            {/* Duration Summary */}
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <span className="stat-label">Duration</span>
              </div>
              <div className="duration-summary">
                <div className="duration-row">
                  <span className="duration-label">Base Time</span>
                  <span className="duration-value">
                    {stats.totalBaseDuration} min
                  </span>
                </div>
                <div className="duration-row">
                  <span className="duration-label">Extensions</span>
                  <span className="duration-value accent">
                    {stats.totalExtensions}× (+{stats.totalExtensionMinutes}{" "}
                    min)
                  </span>
                </div>
                <div className="duration-row total">
                  <span className="duration-label">Total</span>
                  <span className="duration-value">
                    {stats.totalBaseDuration + stats.totalExtensionMinutes} min
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Machines Row */}
          <div className="stats-row machines">
            {/* Winline */}
            <div className="stat-card machine">
              <div className="stat-header">
                <div className="machine-name">
                  <span className="stat-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <rect x="9" y="9" width="6" height="6" />
                    </svg>
                  </span>
                  <span>Winline</span>
                  <span className="power-badge">160kW</span>
                </div>
                <span className="session-count">
                  {stats.countMBS1} sessions
                </span>
              </div>
              <div className="machine-stats">
                <div className="machine-stat-row">
                  <span className="arch-tag">400V</span>
                  <span className="stat-value">
                    {stats.avgKwhMBS1_400V} kWh
                  </span>
                  <span className="session-mini">{stats.countMBS1_400V}</span>
                </div>
                <div className="machine-stat-row">
                  <span className="arch-tag accent">800V</span>
                  <span className="stat-value accent">
                    {stats.avgKwhMBS1_800V} kWh
                  </span>
                  <span className="session-mini">{stats.countMBS1_800V}</span>
                </div>
              </div>
            </div>

            {/* Yotai */}
            <div className="stat-card machine">
              <div className="stat-header">
                <div className="machine-name">
                  <span className="stat-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <rect x="9" y="9" width="6" height="6" />
                    </svg>
                  </span>
                  <span>Yotai</span>
                  <span className="power-badge">180kW</span>
                </div>
                <span className="session-count">
                  {stats.countMBS2} sessions
                </span>
              </div>
              <div className="machine-stats">
                <div className="machine-stat-row">
                  <span className="arch-tag">400V</span>
                  <span className="stat-value">
                    {stats.avgKwhMBS2_400V} kWh
                  </span>
                  <span className="session-mini">{stats.countMBS2_400V}</span>
                </div>
                <div className="machine-stat-row">
                  <span className="arch-tag accent">800V</span>
                  <span className="stat-value accent">
                    {stats.avgKwhMBS2_800V} kWh
                  </span>
                  <span className="session-mini">{stats.countMBS2_800V}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Charts Section */}
      {(performanceChartData.count400V > 0 ||
        performanceChartData.count800V > 0) && (
        <div className="performance-charts-section">
          <div className="performance-charts-with-panel">
            {/* ── LEFT: kW Chart ────────────────────────────────────────── */}
            <div className="performance-chart-box">
              <div className="chart-box-header">
                <div className="header-content">
                  <h3>Performance Chart By kW</h3>
                  <span className="chart-hint">
                    💡 Click any data point to lock details in the panel
                  </span>
                </div>
                <div className="chart-view-toggle">
                  <button
                    className={`toggle-btn ${kwChartView === "400V" ? "active" : ""}`}
                    onClick={() => setKwChartView("400V")}
                  >
                    400V ({performanceChartData.count400V})
                  </button>
                  <button
                    className={`toggle-btn accent ${kwChartView === "800V" ? "active" : ""}`}
                    onClick={() => setKwChartView("800V")}
                  >
                    800V ({performanceChartData.count800V})
                  </button>
                </div>
              </div>
              <div className="chart-container">
                {kwChartView === "400V" &&
                performanceChartData.kw400V.sessionCount > 0 ? (
                  <PerformanceBandChart
                    data={performanceChartData.kw400V.chartData}
                    unit="kW"
                    accentColor="#22c55e"
                    sessionCount={performanceChartData.kw400V.sessionCount}
                    colors={performanceChartData.kw400V.colors}
                    chartLabel="kW · 400V Architecture"
                    onHover={setChartInfoData}
                    onPointClick={(d) =>
                      setLockedChartInfo((prev) =>
                        prev?.minute === d?.minute &&
                        prev?.chartLabel === d?.chartLabel
                          ? null
                          : d,
                      )
                    }
                  />
                ) : kwChartView === "800V" &&
                  performanceChartData.kw800V.sessionCount > 0 ? (
                  <PerformanceBandChart
                    data={performanceChartData.kw800V.chartData}
                    unit="kW"
                    accentColor="var(--accent)"
                    sessionCount={performanceChartData.kw800V.sessionCount}
                    colors={performanceChartData.kw800V.colors}
                    chartLabel="kW · 800V Architecture"
                    onHover={setChartInfoData}
                    onPointClick={(d) =>
                      setLockedChartInfo((prev) =>
                        prev?.minute === d?.minute &&
                        prev?.chartLabel === d?.chartLabel
                          ? null
                          : d,
                      )
                    }
                  />
                ) : (
                  <div className="no-data-message">
                    No sessions with bucket data for {kwChartView}
                  </div>
                )}
              </div>
            </div>

            {/* ── MIDDLE: Shared Info Panel ─────────────────────────────── */}
            <ChartInfoPanel
              hoverData={chartInfoData}
              lockedData={lockedChartInfo}
              onUnlock={() => setLockedChartInfo(null)}
            />

            {/* ── RIGHT: Voltage & Current Chart ────────────────────────── */}
            <div className="performance-chart-box">
              <div className="chart-box-header">
                <h3>Performance Chart By Voltage &amp; Current</h3>
                <div className="chart-view-toggle multi">
                  <button
                    className={`toggle-btn ${voltageCurrentChartView === "400V-A" ? "active" : ""}`}
                    onClick={() => setVoltageCurrentChartView("400V-A")}
                  >
                    400V (A)
                  </button>
                  <button
                    className={`toggle-btn accent ${voltageCurrentChartView === "800V-A" ? "active" : ""}`}
                    onClick={() => setVoltageCurrentChartView("800V-A")}
                  >
                    800V (A)
                  </button>
                  <button
                    className={`toggle-btn ${voltageCurrentChartView === "400V-V" ? "active" : ""}`}
                    onClick={() => setVoltageCurrentChartView("400V-V")}
                  >
                    400V (V)
                  </button>
                  <button
                    className={`toggle-btn accent ${voltageCurrentChartView === "800V-V" ? "active" : ""}`}
                    onClick={() => setVoltageCurrentChartView("800V-V")}
                  >
                    800V (V)
                  </button>
                </div>
              </div>
              <div className="chart-container">
                {voltageCurrentChartView === "400V-A" &&
                performanceChartData.current400V.sessionCount > 0 ? (
                  <PerformanceBandChart
                    data={performanceChartData.current400V.chartData}
                    unit="A"
                    accentColor="#22c55e"
                    sessionCount={performanceChartData.current400V.sessionCount}
                    colors={performanceChartData.current400V.colors}
                    chartLabel="Current (A) · 400V Architecture"
                    onHover={setChartInfoData}
                    onPointClick={(d) =>
                      setLockedChartInfo((prev) =>
                        prev?.minute === d?.minute &&
                        prev?.chartLabel === d?.chartLabel
                          ? null
                          : d,
                      )
                    }
                  />
                ) : voltageCurrentChartView === "800V-A" &&
                  performanceChartData.current800V.sessionCount > 0 ? (
                  <PerformanceBandChart
                    data={performanceChartData.current800V.chartData}
                    unit="A"
                    accentColor="var(--accent)"
                    sessionCount={performanceChartData.current800V.sessionCount}
                    colors={performanceChartData.current800V.colors}
                    chartLabel="Current (A) · 800V Architecture"
                    onHover={setChartInfoData}
                    onPointClick={(d) =>
                      setLockedChartInfo((prev) =>
                        prev?.minute === d?.minute &&
                        prev?.chartLabel === d?.chartLabel
                          ? null
                          : d,
                      )
                    }
                  />
                ) : voltageCurrentChartView === "400V-V" &&
                  performanceChartData.voltage400V.sessionCount > 0 ? (
                  <PerformanceBandChart
                    data={performanceChartData.voltage400V.chartData}
                    unit="V"
                    accentColor="#22c55e"
                    sessionCount={performanceChartData.voltage400V.sessionCount}
                    colors={performanceChartData.voltage400V.colors}
                    chartLabel="Voltage (V) · 400V Architecture"
                    onHover={setChartInfoData}
                    onPointClick={(d) =>
                      setLockedChartInfo((prev) =>
                        prev?.minute === d?.minute &&
                        prev?.chartLabel === d?.chartLabel
                          ? null
                          : d,
                      )
                    }
                  />
                ) : voltageCurrentChartView === "800V-V" &&
                  performanceChartData.voltage800V.sessionCount > 0 ? (
                  <PerformanceBandChart
                    data={performanceChartData.voltage800V.chartData}
                    unit="V"
                    accentColor="var(--accent)"
                    sessionCount={performanceChartData.voltage800V.sessionCount}
                    colors={performanceChartData.voltage800V.colors}
                    chartLabel="Voltage (V) · 800V Architecture"
                    onHover={setChartInfoData}
                    onPointClick={(d) =>
                      setLockedChartInfo((prev) =>
                        prev?.minute === d?.minute &&
                        prev?.chartLabel === d?.chartLabel
                          ? null
                          : d,
                      )
                    }
                  />
                ) : (
                  <div className="no-data-message">
                    No sessions with bucket data
                  </div>
                )}
              </div>
            </div>
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
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous page"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="pagination-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-number ${currentPage === pageNum ? "active" : ""}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                className="pagination-btn"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                title="Next page"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </button>
              <span className="pagination-info">
                {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of{" "}
                {filteredData.length}
              </span>
            </div>
          )}
        </section>

        {/* Chart Panel */}
        <section className="chart-panel">
          {selectedSession ? (
            <>
              <div className="chart-header">
                <div>
                  <h2>Session Details</h2>
                  <p className="chart-subtitle">{selectedSession.full_id}</p>
                </div>
                <button
                  className="close-btn"
                  onClick={() => setSelectedSession(null)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Full Session Details */}
              <div className="session-detail-grid full">
                <div className="detail-item">
                  <span className="detail-label">User</span>
                  <span className="detail-value">
                    {selectedSession.participant_label}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Site</span>
                  <span className="detail-value">
                    {selectedSession.ems_site}
                  </span>
                </div>
                {/* <div className="detail-item">
                  <span className="detail-label">Charger ID</span>
                  <span className="detail-value">{selectedSession.cpid}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Connector</span>
                  <span className="detail-value">
                    {selectedSession.connector_id}
                  </span>
                </div> */}
                <div className="detail-item">
                  <span className="detail-label">Machine Type</span>
                  <span className="detail-value">
                    {selectedSession.machine_type}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Connector Type</span>
                  <span className="detail-value">
                    {selectedSession.connector_type}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Start Time</span>
                  <span className="detail-value">
                    {new Date(selectedSession.start_time).toLocaleString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">End Time</span>
                  <span className="detail-value">
                    {selectedSession.end_time
                      ? new Date(selectedSession.end_time).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value highlight">
                    {selectedSession.duration_minutes} min
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Extensions</span>
                  <span className="detail-value">
                    {selectedSession.extension_count || 0}× (+
                    {selectedSession.extension_minutes || 0} min)
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">{selectedSession.status}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">SOC Start</span>
                  <span className="detail-value">
                    {selectedSession.soc_start}%
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">SOC End</span>
                  <span className="detail-value">
                    {selectedSession.soc_end}%
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">SOC Gain</span>
                  <span className="detail-value highlight">
                    {selectedSession.soc_gain}%
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Energy</span>
                  <span className="detail-value highlight">
                    {selectedSession.total_kwh.toFixed(2)} kWh
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Avg Power</span>
                  <span className="detail-value">
                    {selectedSession.average_kw.toFixed(2)} kW
                  </span>
                </div>
                {/* <div className="detail-item">
                  <span className="detail-label">EV Capacity</span>
                  <span className="detail-value">
                    {selectedSession.ev_capacity_kwh} kWh
                  </span>
                </div> */}
                <div className="detail-item">
                  <span className="detail-label">Cost</span>
                  <span className="detail-value highlight">
                    ${selectedSession.final_cost.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* First 10 Min Inline */}
              <div className="detail-highlight-row">
                <div className="detail-highlight">
                  <span className="dh-label">Architecture</span>
                  <span
                    className={`dh-value ${selectedSession.voltage_arch === "800V" ? "accent" : ""}`}
                  >
                    {selectedSession.voltage_arch || "400V"}
                  </span>
                </div>
                <div className="detail-highlight">
                  <span className="dh-label">10-Min Energy</span>
                  <span className="dh-value accent">
                    {(selectedSession.kwh_10_min || 0).toFixed(2)} kWh
                  </span>
                </div>
                <div className="detail-highlight">
                  <span className="dh-label">10-Min Power</span>
                  <span className="dh-value accent">
                    {(selectedSession.kw_10_min || 0).toFixed(2)} kW
                  </span>
                </div>
                <div className="detail-highlight">
                  <span className="dh-label">10-Min SOC</span>
                  <span className="dh-value">
                    +{(selectedSession.soc_10_min_gain || 0).toFixed(0)}%
                  </span>
                </div>
                <div className="detail-highlight">
                  <span className="dh-label">Avg Voltage</span>
                  <span className="dh-value">
                    {(selectedSession.avg_voltage || 0).toFixed(0)}V
                  </span>
                </div>
                <div className="detail-highlight">
                  <span className="dh-label">Avg Current</span>
                  <span className="dh-value">
                    {(selectedSession.avg_current || 0).toFixed(1)}A
                  </span>
                </div>
              </div>

              <div className="detail-highlight-row">
                <div className="detail-item">
                  <span className="detail-label">Session Note</span>
                  <span className="detail-value">
                    {selectedSession.session_note}
                  </span>
                </div>
              </div>

              {/* Time Range Filter */}
              <div className="time-range-filter">
                <label>Chart Time Range:</label>
                <div className="time-range-buttons">
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`time-btn ${chartTimeRange === option.value ? "active" : ""}`}
                      onClick={() => setChartTimeRange(option.value)}
                      disabled={
                        typeof option.value === "number" &&
                        option.value > selectedSession.duration_minutes
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="charts-container">
                <ChartCard
                  title="Power & State of Charge"
                  data={chartData}
                  dataKey="avgPowerKw"
                  color="#f97316"
                  unit="kW"
                  secondaryDataKey="socPercent"
                  secondaryColor="#52525b"
                  secondaryUnit="%"
                />

                <ChartCard
                  title="Voltage & Current"
                  data={chartData}
                  dataKey="avgVoltageV"
                  color="#52525b"
                  unit="V"
                  secondaryDataKey="avgCurrentA"
                  secondaryColor="#f97316"
                  secondaryUnit="A"
                />
              </div>
            </>
          ) : (
            <div className="chart-placeholder">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-4-4-3 3" />
              </svg>
              <h3>Select a Session</h3>
              <p>
                Click on any session card to view detailed analytics and
                charging curves
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default App;
