/**
 * Custom hook for calculating performance chart data
 */

import { useMemo, useCallback } from "react";
import { generateColors, calcPercentiles } from "../utils/helpers";

/**
 * Get actual end time in minutes for a bucket
 * Parses range like "10:00-10:43" to get 10.717 (10 + 43/60)
 * Falls back to durationSec if range parsing fails
 */
const getBucketEndTime = (bucket, bucketIndex) => {
  // Try to parse range (e.g., "10:00-10:43")
  if (bucket.label) {
    const match = bucket.label.match(/(\d+):(\d+)-(\d+):(\d+)/);
    if (match) {
      const endMin = parseInt(match[3], 10);
      const endSec = parseInt(match[4], 10);
      return endMin + endSec / 60;
    }
  }

  // Fallback: use durationSec to calculate partial minute
  if (bucket.durationSec !== undefined && bucket.durationSec < 60) {
    return bucketIndex + bucket.durationSec / 60;
  }

  // Default: assume full minute
  return bucketIndex + 1;
};

/**
 * Format time as MM:SS
 */
const formatTimeMinSec = (minutes) => {
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const usePerformanceChartData = (filteredData) => {
  return useMemo(() => {
    // Filter sessions that have bucket data
    const sessionsWithBuckets = filteredData.filter(
      (s) => s.buckets && s.buckets.length >= 0,
    );

    // Separate by voltage architecture
    const sessions400V = sessionsWithBuckets.filter(
      (s) => s.voltage_arch === "400V",
    );
    const sessions800V = sessionsWithBuckets.filter(
      (s) => s.voltage_arch === "800V",
    );

    // Process chart data by MINUTES
    // Sessions ending at partial minutes (e.g., 10:43) show at that minute (10), not the next (11)
    const processChartDataByMinutes = (sessions, dataKey) => {
      if (sessions.length === 0)
        return { chartData: [], sessionCount: 0, colors: [] };

      const colors = generateColors(sessions.length);
      const dataPointsMap = new Map(); // Map<minute, dataPoint>

      sessions.forEach((session, sessionIdx) => {
        if (!session.buckets) return;

        session.buckets.forEach((bucket, bucketIdx) => {
          const isLastBucket = bucketIdx === session.buckets.length - 1;

          // Calculate actual end time for this bucket
          const actualEndTime = isLastBucket
            ? getBucketEndTime(bucket, bucketIdx)
            : bucketIdx + 1;

          // Determine which minute this data point belongs to
          // For partial last bucket (e.g., 10:43 = 10.72): show at minute 10
          // For full minute bucket (e.g., 11:00): show at minute 11
          let minute;
          if (isLastBucket && actualEndTime < bucketIdx + 1) {
            // Partial last bucket - use floor of actual end time
            minute = Math.floor(actualEndTime);
            if (minute < 1) minute = 1;
          } else {
            // Full minute bucket
            minute = bucketIdx + 1;
          }

          // Get or create data point for this minute
          if (!dataPointsMap.has(minute)) {
            dataPointsMap.set(minute, {
              minute,
              _values: [],
            });
          }

          const dataPoint = dataPointsMap.get(minute);

          // Calculate value based on dataKey
          let value;
          if (dataKey === "cumulativeKwh") {
            value = session.buckets
              .slice(0, bucketIdx + 1)
              .reduce((sum, b, i) => {
                const isLast = i === bucketIdx && isLastBucket;
                const durationFraction =
                  isLast && b.durationSec < 60 ? b.durationSec / 60 : 1;
                return sum + ((b.avgPowerKw || 0) * durationFraction) / 60;
              }, 0);
          } else if (dataKey === "pricePerKwh") {
            const cumulativeKwh = session.buckets
              .slice(0, bucketIdx + 1)
              .reduce((sum, b, i) => {
                const isLast = i === bucketIdx && isLastBucket;
                const durationFraction =
                  isLast && b.durationSec < 60 ? b.durationSec / 60 : 1;
                return sum + ((b.avgPowerKw || 0) * durationFraction) / 60;
              }, 0);
            // $/kWh = (cost at this time) / (kWh at this time)
            // Use actual session end time from last bucket, not booked duration
            const lastBucket = session.buckets[session.buckets.length - 1];
            const sessionActualEndTime = getBucketEndTime(
              lastBucket,
              session.buckets.length - 1,
            );
            const costAtTime =
              (session.final_cost / sessionActualEndTime) * actualEndTime;
            value = cumulativeKwh > 0 ? costAtTime / cumulativeKwh : 0;
          } else if (dataKey === "cumulativeCost") {
            // Cumulative cost up to this point in time
            // Use actual session end time from last bucket
            const lastBucket = session.buckets[session.buckets.length - 1];
            const sessionActualEndTime = getBucketEndTime(
              lastBucket,
              session.buckets.length - 1,
            );
            value = (session.final_cost / sessionActualEndTime) * actualEndTime;
          } else {
            value = bucket[dataKey] ?? 0;
          }

          dataPoint._values.push(value);
          dataPoint[`session_${sessionIdx}`] = value;
          dataPoint[`id_${sessionIdx}`] =
            session.session_id ?? `Session ${sessionIdx + 1}`;
          dataPoint[`color_${sessionIdx}`] = colors[sessionIdx];
          // Store actual end time for each session (for display in side panel)
          dataPoint[`endTime_${sessionIdx}`] = actualEndTime;
          dataPoint[`endTimeFormatted_${sessionIdx}`] =
            formatTimeMinSec(actualEndTime);
          // Store time range from bucket label (e.g., "10:00-10:43")
          dataPoint[`timeRange_${sessionIdx}`] =
            bucket.label ||
            `${bucketIdx}:00-${formatTimeMinSec(actualEndTime)}`;
          // Store total session duration
          const totalDuration = session.duration_minutes ?? 0;
          dataPoint[`totalDuration_${sessionIdx}`] = totalDuration;
          dataPoint[`totalDurationFormatted_${sessionIdx}`] =
            formatTimeMinSec(totalDuration);
          // Track if this is the last bucket of the session
          dataPoint[`isLastBucket_${sessionIdx}`] = isLastBucket;
          // Check if user stopped early: ONLY if this is the last bucket AND total duration > ceiling of actual end time
          // e.g., duration=20, actualEndTime=10.72, isLastBucket=true → 20 > 11 → stopped early
          // e.g., duration=10, actualEndTime=10.38, isLastBucket=true → 10 <= 11 → normal
          // If not last bucket, stoppedEarly is always false (session still ongoing)
          const stoppedEarly =
            isLastBucket && totalDuration > Math.ceil(actualEndTime);
          dataPoint[`stoppedEarly_${sessionIdx}`] = stoppedEarly;
        });
      });

      // Convert map to sorted array and calculate percentiles
      const chartData = Array.from(dataPointsMap.values())
        .sort((a, b) => a.minute - b.minute)
        .map((dp) => {
          const { _values, ...rest } = dp;
          return { ...rest, ...calcPercentiles(_values) };
        });

      return { chartData, sessionCount: sessions.length, colors };
    };

    // Process chart data by SOC (X-axis = SOC 0-100%)
    const processChartDataBySoC = (sessions, dataKey) => {
      if (sessions.length === 0)
        return { chartData: [], sessionCount: 0, colors: [] };

      const colors = generateColors(sessions.length);
      const chartData = [];

      for (let soc = 0; soc <= 100; soc++) {
        const dataPoint = { soc };
        const values = [];

        sessions.forEach((session, idx) => {
          if (!session.buckets) return;

          const bucketsAtSoc = session.buckets.filter((b) => {
            const bucketSoc = Math.round(b.socPercent ?? 0);
            return bucketSoc === soc;
          });

          if (bucketsAtSoc.length > 0) {
            let value;
            const bucketIdx = session.buckets.findIndex(
              (b) => Math.round(b.socPercent ?? 0) === soc,
            );
            const isLastBucket = bucketIdx === session.buckets.length - 1;
            const actualEndTime = isLastBucket
              ? getBucketEndTime(session.buckets[bucketIdx], bucketIdx)
              : bucketIdx + 1;

            if (dataKey === "cumulativeKwh") {
              value = session.buckets
                .slice(0, bucketIdx + 1)
                .reduce((sum, b, i) => {
                  const isLast = i === session.buckets.length - 1;
                  const durationFraction =
                    isLast && b.durationSec < 60 ? b.durationSec / 60 : 1;
                  return sum + ((b.avgPowerKw || 0) * durationFraction) / 60;
                }, 0);
            } else if (dataKey === "pricePerKwh") {
              const cumulativeKwh = session.buckets
                .slice(0, bucketIdx + 1)
                .reduce((sum, b, i) => {
                  const isLast = i === session.buckets.length - 1;
                  const durationFraction =
                    isLast && b.durationSec < 60 ? b.durationSec / 60 : 1;
                  return sum + ((b.avgPowerKw || 0) * durationFraction) / 60;
                }, 0);
              // $/kWh = (cost at this time) / (kWh at this time)
              // Use actual session end time from last bucket
              const lastBucket = session.buckets[session.buckets.length - 1];
              const sessionActualEndTime = getBucketEndTime(
                lastBucket,
                session.buckets.length - 1,
              );
              const costAtTime =
                (session.final_cost / sessionActualEndTime) * actualEndTime;
              value = cumulativeKwh > 0 ? costAtTime / cumulativeKwh : 0;
            } else if (dataKey === "cumulativeCost") {
              // Cumulative cost up to this point
              // Use actual session end time from last bucket
              const lastBucket = session.buckets[session.buckets.length - 1];
              const sessionActualEndTime = getBucketEndTime(
                lastBucket,
                session.buckets.length - 1,
              );
              value =
                (session.final_cost / sessionActualEndTime) * actualEndTime;
            } else {
              value =
                bucketsAtSoc.reduce((sum, b) => sum + (b[dataKey] ?? 0), 0) /
                bucketsAtSoc.length;
            }
            values.push(value);
            dataPoint[`session_${idx}`] = value;
            dataPoint[`id_${idx}`] = session.session_id ?? `Session ${idx + 1}`;
            dataPoint[`color_${idx}`] = colors[idx];
            // Store actual end time for each session
            dataPoint[`endTime_${idx}`] = actualEndTime;
            dataPoint[`endTimeFormatted_${idx}`] =
              formatTimeMinSec(actualEndTime);
            // Store time range from bucket label
            const bucket = session.buckets[bucketIdx];
            dataPoint[`timeRange_${idx}`] =
              bucket.label ||
              `${bucketIdx}:00-${formatTimeMinSec(actualEndTime)}`;
            // Store total session duration
            const totalDuration = session.duration_minutes ?? 0;
            dataPoint[`totalDuration_${idx}`] = totalDuration;
            dataPoint[`totalDurationFormatted_${idx}`] =
              formatTimeMinSec(totalDuration);
            // Track if this is the last bucket of the session
            dataPoint[`isLastBucket_${idx}`] = isLastBucket;
            // Check if user stopped early: ONLY if this is the last bucket
            const stoppedEarly =
              isLastBucket && totalDuration > Math.ceil(actualEndTime);
            dataPoint[`stoppedEarly_${idx}`] = stoppedEarly;
          }
        });

        if (values.length > 0) {
          Object.assign(dataPoint, calcPercentiles(values));
          chartData.push(dataPoint);
        }
      }

      return { chartData, sessionCount: sessions.length, colors };
    };

    // Process combined cost + kWh data by minutes for dual Y-axis chart
    const processCostWithKwhByMinutes = (sessions) => {
      if (sessions.length === 0)
        return { chartData: [], sessionCount: 0, colors: [] };

      const colors = generateColors(sessions.length);
      const dataPointsMap = new Map();

      sessions.forEach((session, sessionIdx) => {
        if (!session.buckets) return;

        session.buckets.forEach((bucket, bucketIdx) => {
          const isLastBucket = bucketIdx === session.buckets.length - 1;
          const actualEndTime = isLastBucket
            ? getBucketEndTime(bucket, bucketIdx)
            : bucketIdx + 1;

          // Determine which minute this data point belongs to
          let minute;
          if (isLastBucket && actualEndTime < bucketIdx + 1) {
            minute = Math.floor(actualEndTime);
            if (minute < 1) minute = 1;
          } else {
            minute = bucketIdx + 1;
          }

          if (!dataPointsMap.has(minute)) {
            dataPointsMap.set(minute, {
              minute,
              _costValues: [],
              _kwhValues: [],
            });
          }

          const dataPoint = dataPointsMap.get(minute);

          const cumulativeKwh = session.buckets
            .slice(0, bucketIdx + 1)
            .reduce((sum, b, i) => {
              const isLast = i === bucketIdx && isLastBucket;

              // Convert duration to fraction of an hour (seconds / 3600)
              // If it's not the last bucket, we assume the full bucket (60s / 3600 = 1/60)
              const durationInHours = isLast ? b.durationSec / 3600 : 1 / 60;

              return sum + (b.avgPowerKw || 0) * durationInHours;
            }, 0);

          // console.log("cummulative kWh:", session.session_id, cumulativeKwh);

          // $/kWh = (cost at this time) / (kWh at this time)
          // Use actual session end time from last bucket, not booked duration
          const lastBucket = session.buckets[session.buckets.length - 1];
          const sessionActualEndTime = getBucketEndTime(
            lastBucket,
            session.buckets.length - 1,
          );
          const cumulativeCost =
            (session.final_cost / sessionActualEndTime) * actualEndTime;
          const pricePerKwh =
            cumulativeKwh > 0 ? cumulativeCost / cumulativeKwh : 0;

          dataPoint._costValues.push(pricePerKwh);
          dataPoint._kwhValues.push(cumulativeKwh);
          dataPoint[`cost_${sessionIdx}`] = pricePerKwh;
          dataPoint[`kwh_${sessionIdx}`] = cumulativeKwh;
          dataPoint[`cumulativeCost_${sessionIdx}`] = cumulativeCost;
          dataPoint[`session_${sessionIdx}`] = pricePerKwh;
          dataPoint[`id_${sessionIdx}`] =
            session.session_id ?? `Session ${sessionIdx + 1}`;
          dataPoint[`color_${sessionIdx}`] = colors[sessionIdx];
          dataPoint[`endTime_${sessionIdx}`] = actualEndTime;
          dataPoint[`endTimeFormatted_${sessionIdx}`] =
            formatTimeMinSec(actualEndTime);
          dataPoint[`timeRange_${sessionIdx}`] =
            bucket.label ||
            `${bucketIdx}:00-${formatTimeMinSec(actualEndTime)}`;
          const totalDuration = session.duration_minutes ?? 0;
          dataPoint[`totalDuration_${sessionIdx}`] = totalDuration;
          dataPoint[`totalDurationFormatted_${sessionIdx}`] =
            formatTimeMinSec(totalDuration);
          dataPoint[`isLastBucket_${sessionIdx}`] = isLastBucket;
          const stoppedEarly =
            isLastBucket && totalDuration > Math.ceil(actualEndTime);
          dataPoint[`stoppedEarly_${sessionIdx}`] = stoppedEarly;
        });
      });

      // Convert map to sorted array and calculate percentiles for both cost and kWh
      const chartData = Array.from(dataPointsMap.values())
        .sort((a, b) => a.minute - b.minute)
        .map((dp) => {
          const { _costValues, _kwhValues, ...rest } = dp;
          const costPercentiles = calcPercentiles(_costValues);
          const kwhPercentiles = calcPercentiles(_kwhValues);
          return {
            ...rest,
            // Cost percentiles (primary)
            average: costPercentiles.average,
            median: costPercentiles.median,
            band_outer_base: costPercentiles.band_outer_base,
            band_outer_delta: costPercentiles.band_outer_delta,
            band_inner_base: costPercentiles.band_inner_base,
            band_inner_delta: costPercentiles.band_inner_delta,
            // kWh percentiles (secondary)
            kwh_average: kwhPercentiles.average,
            kwh_median: kwhPercentiles.median,
            kwh_band_outer_base: kwhPercentiles.band_outer_base,
            kwh_band_outer_delta: kwhPercentiles.band_outer_delta,
            kwh_band_inner_base: kwhPercentiles.band_inner_base,
            kwh_band_inner_delta: kwhPercentiles.band_inner_delta,
          };
        });

      return { chartData, sessionCount: sessions.length, colors };
    };

    // Process chart data by kWh (X-axis = cumulative kWh)
    const processChartDataByKwh = (sessions, dataKey) => {
      if (sessions.length === 0)
        return { chartData: [], sessionCount: 0, colors: [] };

      const colors = generateColors(sessions.length);
      const dataPointsMap = new Map(); // Map<kwhBucket, dataPoint>

      sessions.forEach((session, sessionIdx) => {
        if (!session.buckets) return;

        session.buckets.forEach((bucket, bucketIdx) => {
          const isLastBucket = bucketIdx === session.buckets.length - 1;
          const actualEndTime = isLastBucket
            ? getBucketEndTime(bucket, bucketIdx)
            : bucketIdx + 1;

          // Calculate cumulative kWh at this bucket
          const cumulativeKwh = session.buckets
            .slice(0, bucketIdx + 1)
            .reduce((sum, b, i) => {
              const isLast = i === bucketIdx && isLastBucket;
              const durationFraction =
                isLast && b.durationSec < 60 ? b.durationSec / 60 : 1;
              return sum + ((b.avgPowerKw || 0) * durationFraction) / 60;
            }, 0);

          // Round kWh to 0.5 increments for grouping
          const kwhBucket = Math.round(cumulativeKwh * 2) / 2;
          if (kwhBucket <= 0) return;

          // Get or create data point for this kWh bucket
          if (!dataPointsMap.has(kwhBucket)) {
            dataPointsMap.set(kwhBucket, {
              kwh: kwhBucket,
              _values: [],
            });
          }

          const dataPoint = dataPointsMap.get(kwhBucket);

          // Calculate value based on dataKey
          let value;
          if (dataKey === "pricePerKwh") {
            // $/kWh = (cost at this time) / (kWh at this time)
            // Use actual session end time from last bucket
            const lastBucket = session.buckets[session.buckets.length - 1];
            const sessionActualEndTime = getBucketEndTime(
              lastBucket,
              session.buckets.length - 1,
            );
            const costAtTime =
              (session.final_cost / sessionActualEndTime) * actualEndTime;
            value = cumulativeKwh > 0 ? costAtTime / cumulativeKwh : 0;
          } else {
            value = bucket[dataKey] ?? 0;
          }

          dataPoint._values.push(value);
          dataPoint[`session_${sessionIdx}`] = value;
          dataPoint[`id_${sessionIdx}`] =
            session.session_id ?? `Session ${sessionIdx + 1}`;
          dataPoint[`color_${sessionIdx}`] = colors[sessionIdx];
          dataPoint[`endTime_${sessionIdx}`] = actualEndTime;
          dataPoint[`endTimeFormatted_${sessionIdx}`] =
            formatTimeMinSec(actualEndTime);
          dataPoint[`timeRange_${sessionIdx}`] =
            bucket.label ||
            `${bucketIdx}:00-${formatTimeMinSec(actualEndTime)}`;
          const totalDuration = session.duration_minutes ?? 0;
          dataPoint[`totalDuration_${sessionIdx}`] = totalDuration;
          dataPoint[`totalDurationFormatted_${sessionIdx}`] =
            formatTimeMinSec(totalDuration);
          dataPoint[`isLastBucket_${sessionIdx}`] = isLastBucket;
          const stoppedEarly =
            isLastBucket && totalDuration > Math.ceil(actualEndTime);
          dataPoint[`stoppedEarly_${sessionIdx}`] = stoppedEarly;
        });
      });

      // Convert map to sorted array and calculate percentiles
      const chartData = Array.from(dataPointsMap.values())
        .sort((a, b) => a.kwh - b.kwh)
        .map((dp) => {
          const { _values, ...rest } = dp;
          return { ...rest, ...calcPercentiles(_values) };
        });

      return { chartData, sessionCount: sessions.length, colors };
    };

    return {
      // Minutes-based charts
      kw400V: processChartDataByMinutes(sessions400V, "avgPowerKw"),
      kw800V: processChartDataByMinutes(sessions800V, "avgPowerKw"),
      current400V: processChartDataByMinutes(sessions400V, "avgCurrentA"),
      current800V: processChartDataByMinutes(sessions800V, "avgCurrentA"),
      voltage400V: processChartDataByMinutes(sessions400V, "avgVoltageV"),
      voltage800V: processChartDataByMinutes(sessions800V, "avgVoltageV"),
      kwh400V: processChartDataByMinutes(sessions400V, "cumulativeKwh"),
      kwh800V: processChartDataByMinutes(sessions800V, "cumulativeKwh"),
      pricePerKwh400V: processChartDataByMinutes(sessions400V, "pricePerKwh"),
      pricePerKwh800V: processChartDataByMinutes(sessions800V, "pricePerKwh"),
      cost400V: processChartDataByMinutes(sessions400V, "cumulativeCost"),
      cost800V: processChartDataByMinutes(sessions800V, "cumulativeCost"),

      // SOC-based charts
      kwBySoc400V: processChartDataBySoC(sessions400V, "avgPowerKw"),
      kwBySoc800V: processChartDataBySoC(sessions800V, "avgPowerKw"),
      currentBySoc400V: processChartDataBySoC(sessions400V, "avgCurrentA"),
      currentBySoc800V: processChartDataBySoC(sessions800V, "avgCurrentA"),
      voltageBySoc400V: processChartDataBySoC(sessions400V, "avgVoltageV"),
      voltageBySoc800V: processChartDataBySoC(sessions800V, "avgVoltageV"),
      kwhBySoc400V: processChartDataBySoC(sessions400V, "cumulativeKwh"),
      kwhBySoc800V: processChartDataBySoC(sessions800V, "cumulativeKwh"),
      pricePerKwhBySoc400V: processChartDataBySoC(sessions400V, "pricePerKwh"),
      pricePerKwhBySoc800V: processChartDataBySoC(sessions800V, "pricePerKwh"),
      costBySoc400V: processChartDataBySoC(sessions400V, "cumulativeCost"),
      costBySoc800V: processChartDataBySoC(sessions800V, "cumulativeCost"),

      // kWh-based charts (X-axis = cumulative kWh)
      costByKwh400V: processChartDataByKwh(sessions400V, "pricePerKwh"),
      costByKwh800V: processChartDataByKwh(sessions800V, "pricePerKwh"),

      // Combined cost + kWh chart data for dual Y-axis view
      costWithKwh400V: processCostWithKwhByMinutes(sessions400V),
      costWithKwh800V: processCostWithKwhByMinutes(sessions800V),

      count400V: sessions400V.length,
      count800V: sessions800V.length,
    };
  }, [filteredData]);
};

/**
 * Hook to get chart data based on axis selection
 */
export const useChartDataSelector = (performanceChartData) => {
  return useCallback(
    (voltageArch, yAxis, xAxis) => {
      const suffix = voltageArch;

      // Special case: cost with time x-axis uses combined costWithKwh data
      if (yAxis === "cost" && xAxis === "minutes") {
        const key = `costWithKwh${suffix}`;
        return (
          performanceChartData[key] || {
            chartData: [],
            sessionCount: 0,
            colors: [],
          }
        );
      }

      // Determine prefix based on X-axis
      let prefix = "";
      if (xAxis === "soc") {
        prefix = "BySoc";
      } else if (xAxis === "kwh") {
        prefix = "ByKwh";
      }

      const keyMap = {
        kW: `kw${prefix}${suffix}`,
        kWh: `kwh${prefix}${suffix}`,
        cost: `cost${prefix}${suffix}`,
        "$/kWh": `pricePerKwh${prefix}${suffix}`,
        voltage: `voltage${prefix}${suffix}`,
        current: `current${prefix}${suffix}`,
      };

      const key = keyMap[yAxis];
      return (
        performanceChartData[key] || {
          chartData: [],
          sessionCount: 0,
          colors: [],
        }
      );
    },
    [performanceChartData],
  );
};

export default usePerformanceChartData;
