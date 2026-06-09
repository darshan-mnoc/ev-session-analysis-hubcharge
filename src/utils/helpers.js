/**
 * Utility functions and helpers
 */

/**
 * Detect if vehicle is Tesla based on session note
 * Tesla vehicles typically identified by:
 * - "Tesla" in the note
 * - Model names: Model S, Model 3, Model X, Model Y, Cybertruck
 * - VIN patterns starting with "5YJ" (Tesla prefix)
 * - NACS connector with specific patterns
 */
export const detectVehicleType = (sessionNote, connectorType) => {
  if (!sessionNote && !connectorType) {
    return { isTesla: false, vehicleType: "Unknown" };
  }

  const note = (sessionNote || "").toLowerCase();

  // Check for Tesla indicators in session note
  const teslaPatterns = [
    /tesla/i,
    /model\s*[s3xy]/i,
    /model\s*s/i,
    /model\s*3/i,
    /model\s*x/i,
    /model\s*y/i,
    /cybertruck/i,
    /5yj[a-z0-9]/i,  // Tesla VIN prefix
    /roadster/i,
    /plaid/i,
  ];

  for (const pattern of teslaPatterns) {
    if (pattern.test(note)) {
      // Try to extract specific model
      if (/model\s*s|models/i.test(note)) return { isTesla: true, vehicleType: "Model S" };
      if (/model\s*3|model3/i.test(note)) return { isTesla: true, vehicleType: "Model 3" };
      if (/model\s*x|modelx/i.test(note)) return { isTesla: true, vehicleType: "Model X" };
      if (/model\s*y|modely/i.test(note)) return { isTesla: true, vehicleType: "Model Y" };
      if (/cybertruck/i.test(note)) return { isTesla: true, vehicleType: "Cybertruck" };
      if (/roadster/i.test(note)) return { isTesla: true, vehicleType: "Roadster" };
      return { isTesla: true, vehicleType: "Tesla" };
    }
  }

  // Check for non-Tesla EVs in session note
  const nonTeslaPatterns = [
    { pattern: /rivian|r1t|r1s/i, type: "Rivian" },
    { pattern: /lucid|air/i, type: "Lucid" },
    { pattern: /ford|mach-?e|f-?150|lightning/i, type: "Ford" },
    { pattern: /chevy|chevrolet|bolt|blazer|equinox|silverado/i, type: "Chevrolet" },
    { pattern: /hyundai|ioniq|kona/i, type: "Hyundai" },
    { pattern: /kia|ev6|ev9|niro/i, type: "Kia" },
    { pattern: /bmw|i4|ix|i7/i, type: "BMW" },
    { pattern: /audi|e-?tron|q4|q8/i, type: "Audi" },
    { pattern: /mercedes|eqs|eqe|eqb/i, type: "Mercedes" },
    { pattern: /volkswagen|vw|id\.?4|id\.?buzz/i, type: "VW" },
    { pattern: /porsche|taycan/i, type: "Porsche" },
    { pattern: /nissan|leaf|ariya/i, type: "Nissan" },
    { pattern: /polestar/i, type: "Polestar" },
    { pattern: /genesis|gv60|gv70|g80/i, type: "Genesis" },
    { pattern: /volvo|xc40|c40|ex90/i, type: "Volvo" },
    { pattern: /cadillac|lyriq/i, type: "Cadillac" },
    { pattern: /gmc|hummer/i, type: "GMC" },
    { pattern: /toyota|bz4x/i, type: "Toyota" },
    { pattern: /honda|prologue/i, type: "Honda" },
    { pattern: /subaru|solterra/i, type: "Subaru" },
    { pattern: /mazda|mx-?30/i, type: "Mazda" },
    { pattern: /mini|cooper/i, type: "Mini" },
    { pattern: /jaguar|i-?pace/i, type: "Jaguar" },
    { pattern: /fisker|ocean/i, type: "Fisker" },
    { pattern: /canoo/i, type: "Canoo" },
    { pattern: /aptera/i, type: "Aptera" },
  ];

  for (const { pattern, type } of nonTeslaPatterns) {
    if (pattern.test(note)) {
      return { isTesla: false, vehicleType: type };
    }
  }

  return { isTesla: false, vehicleType: "Unknown" };
};

/**
 * Map old machine names to new names
 */
const MACHINE_NAME_MAP = {
  winline: "DCFC1",
  Winline: "DCFC1",
  yotai: "DCFC2",
  Yotai: "DCFC2",
};

/**
 * Normalize machine type name (convert old names to new)
 */
export const normalizeMachineType = (machineType) => {
  return MACHINE_NAME_MAP[machineType] || machineType;
};

/**
 * Get machine info based on CPID and connector ID
 */
export const getMachineInfo = (cpid, connectorId) => {
  if (cpid === "MBS_1" && connectorId === 1)
    return { machine_type: "DCFC1", connector_type: "CCS1" };
  if (cpid === "MBS_1" && connectorId === 2)
    return { machine_type: "DCFC1", connector_type: "NACS" };
  if (cpid === "MBS_2" && connectorId === 1)
    return { machine_type: "DCFC2", connector_type: "CCS1" };
  if (cpid === "MBS_2" && connectorId === 2)
    return { machine_type: "DCFC2", connector_type: "NACS" };
  return { machine_type: "unknown", connector_type: "unknown" };
};

/**
 * Generate colors for chart lines using golden angle distribution
 */
export const generateColors = (count) => {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 137.508) % 360;
    colors.push(`hsl(${hue}, 60%, 50%)`);
  }
  return colors;
};

/**
 * Calculate percentiles from an array of values
 */
export const calcPercentiles = (values) => {
  if (values.length === 0) {
    return {
      average: 0,
      median: 0,
      band_outer_base: 0,
      band_outer_delta: 0,
      band_inner_base: 0,
      band_inner_delta: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const pct = (p) => {
    const i = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  };
  return {
    average: values.reduce((a, b) => a + b, 0) / values.length,
    median: pct(50),
    band_outer_base: pct(10),
    band_outer_delta: pct(90) - pct(10),
    band_inner_base: pct(25),
    band_inner_delta: pct(75) - pct(25),
  };
};

/**
 * Format date for display
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString();
};

/**
 * Escape value for CSV export
 */
export const escapeCSV = (value) => {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Process raw bucket data from API
 */
export const processBuckets = (rawBuckets) => {
  if (!Array.isArray(rawBuckets) || rawBuckets.length === 0) {
    return [];
  }

  return rawBuckets.map((b, i) => ({
    min: b.index ?? i,
    label: b.range || `${String(i).padStart(2, "0")}:00`,
    avgPowerKw: Number(b.avgPowerKw || b.avg_power_kw || b.power || 0),
    socPercent: Number(b.socPercent || b.soc_percent || b.soc || 0),
    avgCurrentA: Number(b.avgCurrentA || b.avg_current_a || b.current || 0),
    avgVoltageV: Number(b.avgVoltageV || b.avg_voltage_v || b.voltage || 0),
    durationSec: Number(b.durationSec || b.duration_sec || 60),
  }));
};

/**
 * Calculate voltage architecture from buckets
 */
export const calculateVoltageArch = (buckets, cpid, averageKw) => {
  if (buckets.length > 0) {
    const voltageSum = buckets.reduce(
      (sum, b) => sum + (b.avgVoltageV || 0),
      0,
    );
    const avgVoltage = voltageSum / buckets.length;
    return avgVoltage > 600 ? "800V" : "400V";
  }
  // Fallback logic when no buckets
  return cpid === "MBS_1" && averageKw > 100 ? "800V" : "400V";
};

/**
 * Calculate kWh for first 10 minutes from buckets
 */
export const calculateKwh10Min = (buckets, durationMin, totalKwh) => {
  const duration = parseInt(durationMin);

  if (duration === 10) {
    return totalKwh;
  }

  if (duration > 10 && buckets.length > 0) {
    const first10Buckets = buckets.slice(0, 10);
    // console.log(
    //   `Calculating kWh for first 10 minutes using ${first10Buckets.length} buckets:`,
    //   first10Buckets,
    // );
    return first10Buckets.reduce(
      (sum, b) => sum + (b.avgPowerKw || 0) * (1 / 60),
      0,
    );
  }

  if (buckets.length > 0) {
    const availableBuckets = buckets.slice(0, Math.min(10, buckets.length));
    return availableBuckets.reduce(
      (sum, b) => sum + (b.avgPowerKw || 0) * (1 / 60),
      0,
    );
  }

  return 0;
};

/**
 * Calculate average kW for first 10 minutes
 */
export const calculateKw10Min = (buckets, durationMin, averageKw) => {
  const duration = parseInt(durationMin);

  if (duration === 10) {
    return averageKw;
  }

  if (duration > 10 && buckets.length > 0) {
    const first10Buckets = buckets.slice(0, 10);
    if (first10Buckets.length === 0) return 0;
    return (
      first10Buckets.reduce((sum, b) => sum + (b.avgPowerKw || 0), 0) /
      first10Buckets.length
    );
  }

  if (buckets.length > 0) {
    const availableBuckets = buckets.slice(0, Math.min(10, buckets.length));
    if (availableBuckets.length === 0) return 0;
    return (
      availableBuckets.reduce((sum, b) => sum + (b.avgPowerKw || 0), 0) /
      availableBuckets.length
    );
  }

  return 0;
};

/**
 * Calculate SOC gain in first 10 minutes
 */
export const calculateSoc10MinGain = (
  buckets,
  durationMin,
  socStart,
  socEnd,
) => {
  const duration = parseInt(durationMin);

  if (duration === 10) {
    return socEnd - socStart;
  }

  const first10Buckets = buckets.slice(0, 10);
  if (first10Buckets.length > 0) {
    const soc10MinStart = first10Buckets[0]?.socPercent || socStart;
    const soc10MinEnd =
      first10Buckets[first10Buckets.length - 1]?.socPercent || soc10MinStart;
    return soc10MinEnd - soc10MinStart;
  }

  return 0;
};

/**
 * Get Y-axis unit based on selection
 */
export const getYAxisUnit = (yAxis) => {
  const units = {
    kW: "kW",
    kWh: "kWh",
    cost: "$/kWh",
    "$/kWh": "$/kWh",
    voltage: "V",
    current: "A",
  };
  return units[yAxis] || "";
};

/**
 * Download data as CSV file
 */
export const downloadCSV = (filteredData) => {
  if (filteredData.length === 0) {
    alert("No data to export");
    return;
  }

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

  const csvRows = filteredData.map((session) => [
    session.full_id || "",
    session.user_full_name || "",
    session.ems_site || "",
    normalizeMachineType(session.machine_type) || "",
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
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...csvRows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

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
