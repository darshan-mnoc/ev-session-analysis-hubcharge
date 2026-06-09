/**
 * eBe Financial Calculator Hook
 * Implements full 20-year cash flow projections matching Excel v8.3
 */

import { useState, useMemo, useCallback } from 'react';

// ========== MACRS DEPRECIATION SCHEDULE ==========
const MACRS_5YR_SCHEDULE = [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576];

// ========== DEFAULT PARAMETERS ==========
export const DEFAULT_PARAMS = {
  // CAPEX
  systemCapex: 650000,
  batteryReplacementCost: 60000,

  // INCENTIVES
  federalITC: 30,
  federalITCConversion: 100,
  bonusMACRS: 40,
  federalTaxRate: 21,
  stateTaxRate: 9,

  // LOAD - Separate by year ranges as in Excel
  energyPerSession: 25,
  sessionsPerDayYear1: 30,
  sessionsPerDayYear2: 30,
  sessionsPerDayYear3to5: 30,
  sessionsPerDayYear6to20: 30,
  systemRTE: 89,

  // RATES
  blendedEvRate: 0.60,
  rateInflation: 5,
  gridRechargeCost: 0.17371,
  gridCostInflation: 3,

  // O&M
  hostProfitShare: 10,
  nocLicenseFee: 25,
  annualMaintenance: 2000,
  maintenanceInflation: 3,

  // LP
  lpMinimum: 65000,
  lpHurdleRate: 10,
};

// ========== PARAMETER DEFINITIONS ==========
export const PARAM_DEFINITIONS = {
  capex: {
    label: 'Capex',
    params: [
      { key: 'systemCapex', label: 'Capex per System', unit: '$', min: 100000, max: 2000000, step: 10000 },
      { key: 'batteryReplacementCost', label: 'Battery Cell Replacement / System (Every 5 Yrs)', unit: '$', min: 10000, max: 200000, step: 5000 },
    ]
  },
  incentives: {
    label: 'Incentives',
    params: [
      { key: 'federalITC', label: 'Federal Tax Credit', unit: '%', min: 0, max: 50, step: 1 },
      { key: 'federalITCConversion', label: 'Federal Tax Credit Conversion', unit: '%', min: 0, max: 100, step: 5 },
      { key: 'bonusMACRS', label: 'Federal Bonus MACRS', unit: '%', min: 0, max: 100, step: 5 },
      { key: 'federalTaxRate', label: 'Federal Tax Rate', unit: '%', min: 0, max: 40, step: 1 },
      { key: 'stateTaxRate', label: 'State Tax Rate', unit: '%', min: 0, max: 15, step: 1 },
    ]
  },
  load: {
    label: 'Load',
    params: [
      { key: 'energyPerSession', label: 'Energy per EV Session', unit: 'kWh', min: 5, max: 100, step: 1 },
      { key: 'sessionsPerDayYear1', label: 'Daily Discharge to EV Load Year 1', unit: 'EV/day', min: 1, max: 100, step: 1 },
      { key: 'sessionsPerDayYear2', label: 'Daily Discharge to EV Load Year 2', unit: 'EV/day', min: 1, max: 100, step: 1 },
      { key: 'sessionsPerDayYear3to5', label: 'Daily Discharge to EV Load Year 3-5', unit: 'EV/day', min: 1, max: 100, step: 1 },
      { key: 'sessionsPerDayYear6to20', label: 'Daily Discharge to EV Load Year 6-20', unit: 'EV/day', min: 1, max: 100, step: 1 },
      { key: 'systemRTE', label: 'System RTE', unit: '%', min: 70, max: 98, step: 1 },
    ]
  },
  rates: {
    label: 'Rates',
    params: [
      { key: 'blendedEvRate', label: 'EV Fast Charging', unit: '$/kWh', min: 0.1, max: 2.0, step: 0.01 },
      { key: 'rateInflation', label: 'Annual Inflation', unit: '%', min: 0, max: 15, step: 1 },
      { key: 'gridRechargeCost', label: 'Tariff Blended Total (EV Only 24 Hours Charging Rate)', unit: '$/kWh', min: 0.05, max: 0.5, step: 0.001 },
      { key: 'gridCostInflation', label: 'Tariff Inflation', unit: '%', min: 0, max: 10, step: 1 },
    ]
  },
  oAndM: {
    label: 'O&M',
    params: [
      { key: 'hostProfitShare', label: 'Host Profit Share', unit: '%', min: 0, max: 30, step: 1 },
      { key: 'nocLicenseFee', label: 'NOC License Fee', unit: '%', min: 0, max: 50, step: 5 },
      { key: 'annualMaintenance', label: 'Annual Maintenance Cost', unit: '$', min: 500, max: 10000, step: 100 },
      { key: 'maintenanceInflation', label: 'Annual Inflation for Maintenance', unit: '%', min: 0, max: 10, step: 1 },
    ]
  },
  lpHurdle: {
    label: 'LP Hurdle Rate',
    params: [
      { key: 'lpMinimum', label: 'LP Minimum (Annual)', unit: '$', min: 0, max: 200000, step: 5000 },
      { key: 'lpHurdleRate', label: 'LP Hurdle Rate', unit: '%', min: 5, max: 25, step: 1 },
    ]
  },
};

// ========== CALCULATION FUNCTIONS ==========

const generateCashFlows = (params) => {
  const cashFlows = [];
  const grossCapex = params.systemCapex;
  const rte = params.systemRTE / 100;

  // Year 0: Initial Investment
  cashFlows.push({
    year: 0,
    evChargingRevenue: 0,
    rechargeCost: 0,
    grossProfit: 0,
    oAndM: 0,
    profitShare: 0,
    netIncome: 0,
    annualCashFlow: -grossCapex,
    cumulativeCashFlow: -grossCapex,
  });

  let cumulativeCashFlow = -grossCapex;

  for (let year = 1; year <= 20; year++) {
    // --- TAX INCENTIVES ---
    let taxBenefits = 0;

    // Federal ITC (Year 1 only)
    if (year === 1) {
      taxBenefits += grossCapex * (params.federalITC / 100) * (params.federalITCConversion / 100);
    }

    // Bonus MACRS (Year 1 only)
    if (year === 1) {
      taxBenefits += grossCapex * (params.bonusMACRS / 100) * (params.federalTaxRate / 100);
    }

    // 5-Year MACRS (Years 1-6)
    if (year <= 6) {
      const remainingBasis = grossCapex * (1 - params.bonusMACRS / 100);
      taxBenefits += remainingBasis * MACRS_5YR_SCHEDULE[year - 1] * (params.federalTaxRate / 100);
    }

    // State Straight-Line (Years 1-6)
    if (year <= 6) {
      taxBenefits += (grossCapex / 6) * (params.stateTaxRate / 100);
    }

    // --- REVENUE ---
    // Get sessions per day based on year range (matching Excel structure)
    let sessionsPerDay;
    if (year === 1) {
      sessionsPerDay = params.sessionsPerDayYear1;
    } else if (year === 2) {
      sessionsPerDay = params.sessionsPerDayYear2;
    } else if (year >= 3 && year <= 5) {
      sessionsPerDay = params.sessionsPerDayYear3to5;
    } else {
      sessionsPerDay = params.sessionsPerDayYear6to20;
    }
    const dailyRecharge = sessionsPerDay * params.energyPerSession;
    const dailyDischarge = dailyRecharge * rte;
    const annualDischargeKwh = dailyDischarge * 365;
    const annualRechargeKwh = dailyRecharge * 365;

    // Rate inflation
    const effectiveRate = params.blendedEvRate * Math.pow(1 + params.rateInflation / 100, year - 1);
    const evChargingRevenue = annualDischargeKwh * effectiveRate;

    // --- COSTS ---
    const effectiveGridCost = params.gridRechargeCost * Math.pow(1 + params.gridCostInflation / 100, year - 1);
    const rechargeCost = annualRechargeKwh * effectiveGridCost;

    // Gross Profit
    const grossProfit = evChargingRevenue - rechargeCost;

    // Host Share (10% of gross profit)
    const hostShare = grossProfit * (params.hostProfitShare / 100);

    // NOC Fee (25% of gross profit - host share)
    const nocFee = (grossProfit - hostShare) * (params.nocLicenseFee / 100);

    // Maintenance
    const maintenance = params.annualMaintenance * Math.pow(1 + params.maintenanceInflation / 100, year - 1);

    // O&M = NOC + Maintenance
    const oAndM = nocFee + maintenance;

    // Net Income = Gross Profit - O&M - Host Share
    const netIncome = grossProfit - oAndM - hostShare;

    // Battery replacement
    const cellReplacement = (year === 5 || year === 10 || year === 15) ? params.batteryReplacementCost : 0;

    // LP Net (simplified: Net Income - LP deductions if any)
    const lpNet = netIncome;

    // Annual Cash Flow = Tax Benefits + LP Net - Cell Replacement
    const annualCashFlow = taxBenefits + lpNet - cellReplacement;
    cumulativeCashFlow += annualCashFlow;

    cashFlows.push({
      year,
      evChargingRevenue,
      rechargeCost,
      grossProfit,
      hostShare,
      nocFee,
      maintenance,
      oAndM,
      netIncome,
      taxBenefits,
      cellReplacement,
      lpNet,
      annualCashFlow,
      cumulativeCashFlow,
      // Display values
      effectiveRate,
      effectiveGridCost,
      dailyDischarge,
      dailyRecharge,
      sessionsPerDay,
      annualDischargeKwh,
      annualRechargeKwh,
    });
  }

  // Calculate net capex
  const itcBenefit = grossCapex * (params.federalITC / 100) * (params.federalITCConversion / 100);
  const macrsBenefit = grossCapex * (params.bonusMACRS / 100) * ((params.federalTaxRate + params.stateTaxRate) / 100);

  return {
    grossCapex,
    itcBenefit,
    macrsBenefit,
    netCapex: grossCapex - itcBenefit - macrsBenefit,
    cashFlows,
  };
};

const calculateIRR = (cashFlows) => {
  const flows = cashFlows.map(cf => cf.annualCashFlow);

  // Use bisection method for robustness
  let low = -0.99;
  let high = 2.0;
  let mid = 0.1;

  const npv = (rate) => {
    let sum = 0;
    for (let t = 0; t < flows.length; t++) {
      sum += flows[t] / Math.pow(1 + rate, t);
    }
    return sum;
  };

  // Check if IRR exists
  if (npv(low) * npv(high) > 0) {
    // Try Newton-Raphson as fallback
    let rate = 0.1;
    for (let i = 0; i < 50; i++) {
      let f = 0, df = 0;
      for (let t = 0; t < flows.length; t++) {
        f += flows[t] / Math.pow(1 + rate, t);
        if (t > 0) df -= t * flows[t] / Math.pow(1 + rate, t + 1);
      }
      if (Math.abs(df) < 1e-10) break;
      const newRate = rate - f / df;
      if (Math.abs(newRate - rate) < 1e-6) return newRate * 100;
      rate = Math.max(-0.99, Math.min(10, newRate));
    }
    return rate * 100;
  }

  // Bisection method
  for (let i = 0; i < 100; i++) {
    mid = (low + high) / 2;
    const npvMid = npv(mid);
    if (Math.abs(npvMid) < 0.01 || (high - low) / 2 < 1e-6) {
      return mid * 100;
    }
    if (npv(low) * npvMid < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return mid * 100;
};

const calculatePayback = (cashFlows) => {
  for (let i = 1; i < cashFlows.length; i++) {
    if (cashFlows[i].cumulativeCashFlow >= 0) {
      const prev = cashFlows[i - 1].cumulativeCashFlow;
      const curr = cashFlows[i].cumulativeCashFlow;
      return (i - 1) + (-prev / (curr - prev));
    }
  }
  return 20;
};

const calculateNPV = (cashFlows, discountRate) => {
  let npv = 0;
  const rate = discountRate / 100;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t].annualCashFlow / Math.pow(1 + rate, t);
  }
  return npv;
};

// ========== MAIN HOOK ==========

export const useEbeCalculator = (initialParams = DEFAULT_PARAMS) => {
  const [params, setParams] = useState(initialParams);

  const results = useMemo(() => {
    const { grossCapex, itcBenefit, macrsBenefit, netCapex, cashFlows } = generateCashFlows(params);
    const irr = calculateIRR(cashFlows);
    const paybackYears = calculatePayback(cashFlows);
    const npvAtHurdle = calculateNPV(cashFlows, params.lpHurdleRate);

    const totalRevenue = cashFlows.reduce((sum, cf) => sum + (cf.evChargingRevenue || 0), 0);

    const year1 = cashFlows.find(cf => cf.year === 1);
    const year5 = cashFlows.find(cf => cf.year === 5);
    const year10 = cashFlows.find(cf => cf.year === 10);
    const year20 = cashFlows.find(cf => cf.year === 20);

    const rte = params.systemRTE / 100;
    const batteryCapacity = 240; // kWh

    // Compute daily discharge/recharge for each year range
    const dailyRechargeYear1 = params.sessionsPerDayYear1 * params.energyPerSession;
    const dailyDischargeYear1 = dailyRechargeYear1 * rte;
    const cyclesPerDayYear1 = dailyRechargeYear1 / batteryCapacity;

    const dailyRechargeYear2 = params.sessionsPerDayYear2 * params.energyPerSession;
    const dailyDischargeYear2 = dailyRechargeYear2 * rte;
    const cyclesPerDayYear2 = dailyRechargeYear2 / batteryCapacity;

    const dailyRechargeYear3to5 = params.sessionsPerDayYear3to5 * params.energyPerSession;
    const dailyDischargeYear3to5 = dailyRechargeYear3to5 * rte;
    const cyclesPerDayYear3to5 = dailyRechargeYear3to5 / batteryCapacity;

    const dailyRechargeYear6to20 = params.sessionsPerDayYear6to20 * params.energyPerSession;
    const dailyDischargeYear6to20 = dailyRechargeYear6to20 * rte;
    const cyclesPerDayYear6to20 = dailyRechargeYear6to20 / batteryCapacity;

    return {
      capexData: { grossCapex, itcBenefit, macrsBenefit, netCapex },
      cashFlows,
      irr: isNaN(irr) ? 0 : irr,
      paybackYears: isNaN(paybackYears) ? 20 : paybackYears,
      npvAtHurdle: isNaN(npvAtHurdle) ? 0 : npvAtHurdle,
      meetsHurdle: irr >= params.lpHurdleRate,
      totalRevenue,
      year1Revenue: year1?.evChargingRevenue || 0,
      year5Revenue: year5?.evChargingRevenue || 0,
      year10Revenue: year10?.evChargingRevenue || 0,
      year20Revenue: year20?.evChargingRevenue || 0,
      year1GrossProfit: year1?.grossProfit || 0,
      year1NetIncome: year1?.netIncome || 0,
      // Year 1 computed
      dailyDischargeYear1,
      dailyRechargeYear1,
      cyclesPerDayYear1,
      // Year 2 computed
      dailyDischargeYear2,
      dailyRechargeYear2,
      cyclesPerDayYear2,
      // Year 3-5 computed
      dailyDischargeYear3to5,
      dailyRechargeYear3to5,
      cyclesPerDayYear3to5,
      // Year 6-20 computed
      dailyDischargeYear6to20,
      dailyRechargeYear6to20,
      cyclesPerDayYear6to20,
    };
  }, [params]);

  const updateParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetParams = useCallback(() => {
    setParams(DEFAULT_PARAMS);
  }, []);

  const resetCategory = useCallback((category) => {
    const categoryParams = PARAM_DEFINITIONS[category]?.params || [];
    const defaults = {};
    categoryParams.forEach(p => { defaults[p.key] = DEFAULT_PARAMS[p.key]; });
    setParams(prev => ({ ...prev, ...defaults }));
  }, []);

  return {
    params,
    results,
    updateParam,
    resetParams,
    resetCategory,
    definitions: PARAM_DEFINITIONS,
    defaults: DEFAULT_PARAMS,
  };
};

export default useEbeCalculator;
