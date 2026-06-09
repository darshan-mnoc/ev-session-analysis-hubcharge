/**
 * eBe Model v8.3 Constants & Configuration
 * Energy Balancing Engine Financial Model for EV Charging Infrastructure
 *
 * This model projects 20-year returns for a Battery Storage + DC Fast Charging system.
 * All values are based on HubCharge GP EBE v8.3 financial projections.
 *
 * CONFIDENTIAL - For authorized investor use only
 */

// ========== MODEL VERSION ==========
export const MODEL_VERSION = "v8.3";
export const MODEL_EFFECTIVE_DATE = "2026-04-09";

// ========== CAPEX & SYSTEM SPECIFICATIONS ==========
export const EBE_MODEL = {
  version: MODEL_VERSION,
  effectiveDate: MODEL_EFFECTIVE_DATE,

  // System Configuration
  system: {
    cvpEvSystems: 1, // Number of CVP EV Systems
    dcfcChargers: 2, // DC Fast Chargers (160kW + 180kW)
    bscsNameplateCapacityKw: 60, // Battery System nameplate capacity (kW)
    bscsOperatingCapacityKw: 60, // Operating capacity after derating (kW)
    bscsStorageCapacityKwh: 240, // Total battery storage (kWh)
    systemRte: 0.89, // Round-Trip Efficiency (89%)
    note: "BSCS = Battery Storage Charging System with integrated inverter and BMS",
  },

  // Capital Expenditure
  capex: {
    systemCapexPerUnit: 650000, // $650K per system
    totalSystemCapex: 650000, // Total deployment cost
    batteryReplacementCost: 60000, // Cell replacement every 5 years
    batteryReplacementInterval: 5, // Years between replacements
    note: "Includes installation, commissioning, grid interconnection, and permitting",
  },

  // Federal & State Incentives
  incentives: {
    federalITC: 0.3, // 30% Investment Tax Credit
    federalITCAmount: 195000, // $650K × 30% = $195K
    federalITCConversion: 1.0, // 100% direct pay (Inflation Reduction Act)
    bonusMACRS: 0.4, // 40% first-year bonus depreciation
    federalTaxRate: 0.21, // 21% corporate tax rate
    stateTaxRate: 0.0884, // 8.84% California state tax
    macrsYear1CashValue: 46410, // Year 1 MACRS cash benefit
    netEffectiveCapex: 408590, // After all incentives (~$409K)
    note: "IRA 2022 enables direct pay of ITC for tax-exempt entities; MACRS provides additional depreciation shield",
  },

  // Revenue Model - EV Charging
  evCharging: {
    energyPerSession: 25, // Average kWh per session (recharge from grid)
    blendedEvRate: 0.6, // $0.60/kWh charged to EV drivers (on discharge)
    rateInflationYears1to5: 0.05, // 5% annual rate increase (years 1-5)
    rateInflationYears6to20: 0.05, // 5% annual rate increase (years 6-20)
    note: "EV receives energyPerSession × RTE kWh after battery losses",
  },

  // Utilization Projections (kWh/day discharge to EV load)
  utilization: {
    // Year 1-5: 30 sessions × 25 kWh × 0.89 RTE = 668 kWh discharge
    dailyDischargeYear1to5: 668, // kWh/day delivered to EVs (after RTE)
    sessionsPerDayYear1to5: 30, // 30 EVs per day

    // Year 6-20: Same utilization (can be configured differently)
    dailyDischargeYear6to20: 668, // kWh/day delivered to EVs (after RTE)
    sessionsPerDayYear6to20: 30, // 30 EVs per day

    // Maximum theoretical capacity
    dailyContinuousMaxDischarge: 1282, // Max possible with 24hr cycling
    maxSessionsPerDay: 51, // Hard ceiling (1282 / 25 kWh)

    note: "Daily recharge = sessions × energy; Daily discharge = recharge × 89% RTE",
  },

  // Recharge Costs (Grid electricity to charge battery)
  rechargeCosts: {
    tariff: "SCE TOU-GS-3-D",
    tariffEffectiveDate: "2025-03-01",
    peakBlended: 0.23602, // $/kWh during peak hours
    nonPeakBlended: 0.11598, // $/kWh during non-peak (charging window)
    totalBlended: 0.17371, // 24-hour average $/kWh
    inflationYears1to5: 0.03, // 3% annual tariff increase
    inflationYears6to20: 0.03, // 3% annual tariff increase
    note: "Recharge occurs during off-peak hours (9PM-4PM) to minimize costs; SCE TOU-GS-3-D is optimal for storage",
  },

  // Operating Expenses & Revenue Sharing
  opex: {
    hostProfitShare: 0.1, // 10% of EV revenue to site host
    nocLicenseFee: 0.25, // 25% of host share to NOC (Network Operations)
    bscsMaintenancePerKw: 20, // $20/kW-year for battery maintenance
    dcfcMaintenancePerCharger: 400, // $400/charger-year for DCFC upkeep
    annualBatteryMaintenance: 1200, // Annual battery system service
    annualEvMaintenance: 800, // Annual EV charging equipment service
    totalAnnualMaintenance: 2000, // Combined annual maintenance base
    maintenanceInflation: 0.03, // 3% annual increase
    note: "Host share incentivizes site partnerships; NOC fee covers 24/7 monitoring and support",
  },

  // Battery Degradation Model
  battery: {
    annualDegradation: 0.02, // 2% capacity loss per year
    degradationResetOnReplacement: true, // New cells restore full capacity
    year1Capacity: 1.0, // 100% at start
    year2Capacity: 0.98, // 98% after year 1
    year3Capacity: 0.96, // 96% after year 2
    year4Capacity: 0.94, // 94% after year 3
    year5Capacity: 0.92, // 92% after year 4 (then replacement)
    note: "LFP cells selected for longevity; 5-year replacement cycle ensures consistent performance",
  },

  // Financial Targets & Hurdles
  targets: {
    lpHurdleRate: 0.1, // 10% minimum LP return threshold
    baselineIRR: 19.70, // Model projected 20-year IRR from Excel v8.3 (with 30 sessions/day)
    paybackYears: 4.69, // Years to recover net investment
    targetIRRMin: 12, // Minimum acceptable IRR
    targetIRRMax: 30, // Stretch goal IRR
    projectionYears: 20, // Investment horizon
    note: "IRR accounts for all incentives, revenue growth, and replacement costs; LP hurdle ensures investor alignment",
  },

  // Cash Flow Milestones (from v8.3 projections)
  cashFlowMilestones: {
    year1Revenue: 146182.5, // First full year EV charging revenue
    year1NetIncome: 64629, // After all costs and depreciation
    year5Revenue: 177685.74, // End of ramp-up period
    year6Revenue: 248760.04, // First mature operations year
    year10Revenue: 302369.38, // Mid-life projection
    year20Revenue: 492527.86, // Final year projection
    totalProjectRevenue: 5200000, // Approximate 20-year gross revenue
    note: "Revenue growth driven by rate inflation and utilization increase at year 6",
  },
};

// ========== CHARGER CONFIGURATION ==========
export const CHARGERS = [
  {
    id: "DCFC1",
    name: "DCFC1",
    powerKw: 160,
    connectors: ["CCS1", "NACS"],
    cpid: "MBS_1",
    note: "Primary charger - handles majority of 400V vehicles",
  },
  {
    id: "DCFC2",
    name: "DCFC2",
    powerKw: 180,
    connectors: ["CCS1", "NACS"],
    cpid: "MBS_2",
    note: "High-power charger - optimized for 800V architecture EVs",
  },
];

// ========== PRICING TIERS ==========
export const PRICING = {
  baseSession: {
    duration: 10, // Base session: 10 minutes
    price: 12.5, // $12.50 flat fee
    note: "Entry price point covers average quick-charge need",
  },
  extensions: {
    duration: 5, // Each extension: 5 minutes
    currentPrice: 3.0, // Current: $3.00 per extension
    optimizedPrice: 4.5, // Recommended: $4.50 per extension
    avgExtensionsPerSession: 1.5, // Historical average
    note: "Extension pricing has highest margin; optimization opportunity identified",
  },
};

// ========== CALCULATION NOTES FOR INVESTORS ==========
export const CALCULATION_NOTES = {
  irr: {
    formula: "Newton-Raphson iteration to find rate where NPV = 0",
    inputs: "Initial capex, annual net cash flows for 20 years, terminal value",
    assumptions:
      "Assumes reinvestment at IRR rate; includes battery replacements at years 5, 10, 15",
  },
  payback: {
    formula: "Year when cumulative cash flow turns positive",
    inputs: "Net capex after incentives, annual operating cash flows",
    assumptions:
      "Simple payback without discounting; accelerated by ITC direct pay",
  },
  blendedRate: {
    formula: "Total EV Revenue ÷ Total kWh Dispensed",
    inputs: "All session fees including base price and extensions",
    target: "$0.60/kWh average across all sessions",
  },
  utilizationRate: {
    formula: "(Actual Sessions ÷ Max Possible Sessions) × 100",
    inputs:
      "Max assumes 25 sessions/day per charger (based on avg 30-min charge)",
    note: "Higher utilization directly increases IRR and shortens payback",
  },
  netRevenue: {
    formula:
      "Gross Revenue - Host Share - NOC Fee - Recharge Cost - Maintenance",
    hostShare: "10% of gross to site partner",
    nocFee: "25% of host share (2.5% of gross) to network operations",
    note: "Remaining ~75% of margin retained by asset owner",
  },
};

// ========== HELPER FUNCTIONS ==========

/**
 * Calculate projected annual revenue based on model assumptions
 */
export const calculateProjectedAnnualRevenue = (year = 1) => {
  const { evCharging, utilization } = EBE_MODEL;
  const isRampUp = year <= 5;
  const dailyDischarge = isRampUp
    ? utilization.dailyDischargeYear1to5
    : utilization.dailyDischargeYear6to20;

  // Apply rate inflation
  const inflationFactor = Math.pow(
    1 + evCharging.rateInflationYears1to5,
    year - 1,
  );
  const effectiveRate = evCharging.blendedEvRate * inflationFactor;

  return dailyDischarge * 365 * effectiveRate;
};

/**
 * Calculate projected sessions for a given period
 */
export const getProjectedSessions = (days, year = 1) => {
  const { utilization } = EBE_MODEL;
  const sessionsPerDay =
    year <= 5
      ? utilization.sessionsPerDayYear1to5
      : utilization.sessionsPerDayYear6to20;
  return Math.round(sessionsPerDay * days);
};

/**
 * Calculate projected kWh for a given period
 */
export const getProjectedKwh = (days, year = 1) => {
  const { utilization, evCharging } = EBE_MODEL;
  const sessionsPerDay =
    year <= 5
      ? utilization.sessionsPerDayYear1to5
      : utilization.sessionsPerDayYear6to20;
  return sessionsPerDay * days * evCharging.energyPerSession;
};

/**
 * Calculate projected revenue for a given period
 */
export const getProjectedRevenue = (days, year = 1) => {
  const { evCharging } = EBE_MODEL;
  const kWh = getProjectedKwh(days, year);
  const inflationFactor = Math.pow(
    1 + evCharging.rateInflationYears1to5,
    year - 1,
  );
  return kWh * evCharging.blendedEvRate * inflationFactor;
};

/**
 * Calculate blended rate from actual data
 */
export const calculateBlendedRate = (totalRevenue, totalKwh) => {
  if (totalKwh <= 0) return 0;
  return totalRevenue / totalKwh;
};

/**
 * Calculate utilization rate
 */
export const calculateUtilizationRate = (
  actualSessions,
  days,
  chargersCount = 2,
) => {
  const maxSessionsPerCharger = 25; // Based on ~30min avg session
  const maxSessions = maxSessionsPerCharger * days * chargersCount;
  return (actualSessions / maxSessions) * 100;
};

/**
 * Get degradation factor for a given year
 */
export const getDegradationFactor = (year) => {
  const yearInCycle = ((year - 1) % 5) + 1;
  return 1 - EBE_MODEL.battery.annualDegradation * (yearInCycle - 1);
};
