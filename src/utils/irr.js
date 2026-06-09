/**
 * IRR Calculation Utilities
 * Newton-Raphson method for Internal Rate of Return
 *
 * Based on eBe Model v8.3 financial projections
 */

import { EBE_MODEL } from "../constants/ebeModel";

/**
 * Calculate IRR using Newton-Raphson iteration
 * @param {number[]} cashFlows - Array of cash flows (year 0 = negative capex, subsequent = positive)
 * @param {number} guess - Initial guess (default 0.1 = 10%)
 * @param {number} tolerance - Convergence tolerance
 * @param {number} maxIterations - Maximum iterations
 * @returns {number} IRR as decimal (0.15 = 15%)
 */
export const calculateIRR = (
  cashFlows,
  guess = 0.1,
  tolerance = 0.00001,
  maxIterations = 100
) => {
  if (!cashFlows || cashFlows.length < 2) return 0;

  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    const { npv, derivative } = calculateNPVAndDerivative(cashFlows, rate);

    if (Math.abs(derivative) < tolerance) break;

    const newRate = rate - npv / derivative;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }

    rate = newRate;

    // Prevent divergence
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  return rate;
};

/**
 * Calculate NPV and its derivative for Newton-Raphson
 */
const calculateNPVAndDerivative = (cashFlows, rate) => {
  let npv = 0;
  let derivative = 0;

  for (let t = 0; t < cashFlows.length; t++) {
    const discountFactor = Math.pow(1 + rate, t);
    npv += cashFlows[t] / discountFactor;
    if (t > 0) {
      derivative -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
  }

  return { npv, derivative };
};

/**
 * Calculate NPV for a given rate
 */
export const calculateNPV = (cashFlows, rate) => {
  return cashFlows.reduce((npv, cf, t) => {
    return npv + cf / Math.pow(1 + rate, t);
  }, 0);
};

/**
 * Generate 20-year cash flow projection based on eBe Model v8.3
 * @param {number} annualRevenue - Current annual revenue run rate
 * @param {Object} options - Override model defaults
 * @returns {number[]} Array of 21 cash flows (year 0-20)
 */
export const generateCashFlows = (annualRevenue, options = {}) => {
  const { capex, incentives, opex, evCharging, battery } = EBE_MODEL;

  const cashFlows = [];

  // Year 0: Initial investment (negative)
  // Net capex = System cost - Federal ITC
  const netCapex =
    capex.totalSystemCapex - incentives.federalITCAmount;
  cashFlows.push(-netCapex);

  let currentRevenue = annualRevenue;
  let batteryHealth = 1;

  for (let year = 1; year <= EBE_MODEL.targets.projectionYears; year++) {
    // Apply revenue inflation (rate increases)
    if (year > 1) {
      currentRevenue *= 1 + evCharging.rateInflationYears1to5;
    }

    // Ramp-up factor for years 6+
    if (year === 6) {
      // Revenue jumps ~33% at year 6 due to utilization increase
      currentRevenue *= 1.33;
    }

    // Calculate operating expenses
    const hostShare = currentRevenue * opex.hostProfitShare;
    const nocFee = hostShare * opex.nocLicenseFee;

    // Maintenance with inflation
    const maintenanceInflation = Math.pow(
      1 + opex.maintenanceInflation,
      year - 1
    );
    const maintenance = opex.totalAnnualMaintenance * maintenanceInflation;

    // Recharge cost (electricity to charge battery)
    // Approximate as ~35% of revenue based on model
    const rechargeRate = EBE_MODEL.rechargeCosts.totalBlended;
    const kwhDispensed = currentRevenue / evCharging.blendedEvRate;
    const rechargeCost = kwhDispensed * rechargeRate / EBE_MODEL.system.systemRte;

    // Battery degradation
    batteryHealth *= 1 - battery.annualDegradation;

    // Battery replacement every 5 years
    let batteryReplacementCost = 0;
    if (
      year % capex.batteryReplacementInterval === 0 &&
      year < EBE_MODEL.targets.projectionYears
    ) {
      batteryReplacementCost = capex.batteryReplacementCost;
      batteryHealth = 1; // Reset
    }

    // MACRS depreciation tax shield (simplified)
    let macrsShield = 0;
    if (year === 1) {
      macrsShield = incentives.macrsYear1CashValue;
    } else if (year <= 5) {
      // Declining balance
      macrsShield = incentives.macrsYear1CashValue * Math.pow(0.5, year - 1);
    }

    // Net cash flow
    const netCashFlow =
      currentRevenue -
      hostShare -
      nocFee -
      maintenance -
      rechargeCost -
      batteryReplacementCost +
      macrsShield;

    cashFlows.push(netCashFlow);
  }

  return cashFlows;
};

/**
 * Calculate cumulative IRR at each year point
 * Returns array of { year, irr } for charting
 */
export const calculateIRRTrajectory = (annualRevenue, options = {}) => {
  const fullCashFlows = generateCashFlows(annualRevenue, options);
  const trajectory = [];

  for (let year = 1; year <= EBE_MODEL.targets.projectionYears; year++) {
    const partialCashFlows = fullCashFlows.slice(0, year + 1);
    const irr = calculateIRR(partialCashFlows) * 100;
    trajectory.push({
      year,
      irr: Math.max(-50, Math.min(50, irr)), // Clamp
    });
  }

  return trajectory;
};

/**
 * Generate baseline IRR trajectory from model assumptions
 */
export const generateBaselineIRRTrajectory = () => {
  // Use v8.3 model's projected Year 1 revenue as baseline
  const year1Revenue = EBE_MODEL.cashFlowMilestones.year1Revenue;
  return calculateIRRTrajectory(year1Revenue);
};

/**
 * Calculate payback period in years
 */
export const calculatePaybackPeriod = (cashFlows) => {
  let cumulative = 0;

  for (let year = 0; year < cashFlows.length; year++) {
    cumulative += cashFlows[year];
    if (cumulative >= 0) {
      if (year === 0) return 0;
      const prevCumulative = cumulative - cashFlows[year];
      const fraction = -prevCumulative / cashFlows[year];
      return Math.max(0, year - 1 + fraction);
    }
  }

  return cashFlows.length;
};

/**
 * Calculate IRR impact of extension pricing optimization
 */
export const calculateExtensionOptimizationImpact = (
  currentAnnualRevenue,
  sessionsPerYear,
  avgExtensions = 1.5
) => {
  const { extensionPrice, extensionPriceOptimized } = {
    extensionPrice: 3.0,
    extensionPriceOptimized: 4.5,
  };

  const extensionRevenueCurrent = sessionsPerYear * avgExtensions * extensionPrice;
  const extensionRevenueOptimized =
    sessionsPerYear * avgExtensions * extensionPriceOptimized;
  const revenueIncrease = extensionRevenueOptimized - extensionRevenueCurrent;

  const currentIRR = calculateIRR(generateCashFlows(currentAnnualRevenue)) * 100;
  const optimizedIRR =
    calculateIRR(generateCashFlows(currentAnnualRevenue + revenueIncrease)) * 100;

  return {
    irrDelta: optimizedIRR - currentIRR,
    annualRevenueIncrease: revenueIncrease,
  };
};

/**
 * Calculate IRR for increased sessions
 */
export const calculateSessionsImpact = (
  currentAnnualRevenue,
  currentSessions,
  targetSessions
) => {
  const revenuePerSession =
    currentSessions > 0 ? currentAnnualRevenue / currentSessions : 0;
  const newRevenue = targetSessions * revenuePerSession;

  const currentIRR = calculateIRR(generateCashFlows(currentAnnualRevenue)) * 100;
  const newIRR = calculateIRR(generateCashFlows(newRevenue)) * 100;

  return newIRR - currentIRR;
};
