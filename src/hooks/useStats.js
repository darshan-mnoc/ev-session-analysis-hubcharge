/**
 * Custom hook for calculating statistics from filtered data
 */

import { useMemo } from "react";

export const useStats = (filteredData) => {
  return useMemo(() => {
    if (filteredData.length === 0) return null;

    console.log("Calculating stats for", filteredData.length, "sessions");

    // Helper functions - use pre-calculated session values for consistency
    const avgKwh = (sessions) => {
      const validSessions = sessions.filter((s) => s.total_kwh > 0);
      if (validSessions.length === 0) return 0;
      return (
        validSessions.reduce((sum, s) => sum + s.total_kwh, 0) /
        validSessions.length
      );
    };

    const avgSocGainFn = (sessions) => {
      const validSessions = sessions.filter(
        (s) => !isNaN(s.soc_gain) && s.soc_gain !== null,
      );
      if (validSessions.length === 0) return 0;
      return (
        validSessions.reduce((sum, s) => sum + s.soc_gain, 0) /
        validSessions.length
      );
    };

    const avgPowerFn = (sessions) => {
      const validSessions = sessions.filter((s) => s.average_kw > 0);
      if (validSessions.length === 0) return 0;
      return (
        validSessions.reduce((sum, s) => sum + s.average_kw, 0) /
        validSessions.length
      );
    };

    const avg10MinStats = (sessions, label = "") => {
      let totalKwh = 0;
      let totalKw = 0;
      let totalSoc = 0;
      let count = 0;

      sessions.forEach((s) => {
        const kwh = s.kwh_10_min || 0;
        const kw = s.kw_10_min || 0;
        const socGain = s.soc_10_min_gain || 0;

        // console.log(
        //   `Session ${s.session_id} (${label}): kWh 10min = ${kwh}, kW 10min = ${kw}, SOC gain 10min = ${socGain}`,
        // );

        if (kwh > 0) {
          totalKwh += kwh;
          totalKw += kw;
          totalSoc += socGain;
          count++;
        }
      });

      return {
        avgKw: count ? totalKw / count : 0,
        avgKwh: count ? totalKwh / count : 0,
        avgSoc: count ? totalSoc / count : 0,
      };
    };

    // Basic stats
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

    // Calculate all stats
    const avgSocGain400V = avgSocGainFn(sessions400V);
    const avgSocGain800V = avgSocGainFn(sessions800V);
    const avgPower400V = avgPowerFn(sessions400V);
    const avgPower800V = avgPowerFn(sessions800V);

    const stats10All = avg10MinStats(filteredData);
    const stats10_400V = avg10MinStats(sessions400V, "400V");
    const stats10_800V = avg10MinStats(sessions800V, "800V");

    const stats10_MBS1 = avg10MinStats(sessionsMBS1, "MBS1");
    const stats10_MBS2 = avg10MinStats(sessionsMBS2, "MBS2");

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
      socFilteredCount,
      avgKwhByDurations: avgKwh(filteredData).toFixed(2),
      avgKwh400V: avgKwh(sessions400V).toFixed(2),
      avgKwh800V: avgKwh(sessions800V).toFixed(2),
      avgKwhMBS1: avgKwh(sessionsMBS1).toFixed(2),
      avgKwhMBS2: avgKwh(sessionsMBS2).toFixed(2),
      avgKwhMBS1_400V: avgKwh(sessionsMBS1_400V).toFixed(2),
      avgKwhMBS1_800V: avgKwh(sessionsMBS1_800V).toFixed(2),
      avgKwhMBS2_400V: avgKwh(sessionsMBS2_400V).toFixed(2),
      avgKwhMBS2_800V: avgKwh(sessionsMBS2_800V).toFixed(2),
      avgSocGain400V: avgSocGain400V.toFixed(0),
      avgSocGain800V: avgSocGain800V.toFixed(0),
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
      totalExtensions,
      avgExtensions: avgExtensions.toFixed(1),
      totalBaseDuration,
      totalExtensionMinutes,
    };
  }, [filteredData]);
};

export default useStats;
