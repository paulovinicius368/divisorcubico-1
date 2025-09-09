
import type { AllocateHourlyVolumeOutput } from "@/ai/flows/allocate-hourly-volume";

// Defines the operational parameters for each well
const wellConfigs = {
  "MAAG": {
    startHour: 6,
    endHour: 18,
    limit: 19,
    // A more varied bell-curve pattern for volume distribution
    pattern: [0.4, 0.6, 0.8, 0.95, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4],
  },
  "PECUÁRIA": {
    startHour: 6,
    endHour: 21,
    limit: 10,
    // A longer, more varied pattern for a longer operational window
    pattern: [0.3, 0.45, 0.6, 0.75, 0.9, 1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.6, 0.5, 0.45, 0.4],
  },
  "TCHE": {
    startHour: 7,
    endHour: 19,
    limit: Infinity, // No limit
    // A more pronounced bell curve for typical usage
    pattern: [0.4, 0.65, 0.85, 1.0, 1.0, 1.0, 1.0, 0.9, 0.75, 0.6, 0.5, 0.4],
  },
};

/**
 * Allocates a total daily volume across operational hours for a specific well
 * using a deterministic, pattern-based algorithm.
 *
 * @param totalDailyVolume The total volume in cubic meters for the day.
 * @param well The name of the well (e.g., "MAAG", "PECUÁRIA").
 * @returns An object containing the hourly allocation and an optional overflow warning.
 */
export function allocateVolume(
  totalDailyVolume: number,
  well: "MAAG" | "PECUÁRIA" | "TCHE" | string
): AllocateHourlyVolumeOutput {
  const config = wellConfigs[well as keyof typeof wellConfigs] || wellConfigs["TCHE"];
  const { startHour, endHour, limit, pattern } = config;

  if (totalDailyVolume <= 0) {
     const allocation = Array.from({ length: 24 }, (_, i) => ({ hour: i, volume: 0 }));
     return { allocation };
  }

  // 1. Initial Distribution based on the pattern
  const totalPatternWeight = pattern.reduce((sum, val) => sum + val, 0);
  let allocation = Array.from({ length: 24 }, (_, hour) => {
    if (hour >= startHour && hour <= endHour) {
      const patternIndex = hour - startHour;
      if (patternIndex < pattern.length) {
        const weight = pattern[patternIndex] || 0;
        const initialVolume = (totalDailyVolume * weight) / totalPatternWeight;
        return { hour, volume: initialVolume };
      }
    }
    return { hour, volume: 0 };
  });

  // 2. Check for and handle overflows
  let overflowWarning: string | undefined = undefined;
  for (let i = 0; i < 5; i++) { // Iterate a few times to smooth out redistribution
    let excessVolume = 0;
    let totalUnderLimitWeight = 0;

    // Identify excess volume and calculate total weight of non-offending hours
    allocation.forEach(item => {
      if (item.volume > limit) {
        excessVolume += item.volume - limit;
        item.volume = limit; // Cap the volume at the limit
      }
    });

    if (excessVolume > 0) {
        // Calculate the total weight of hours that are still under the limit
        allocation.forEach(item => {
            if (item.hour >= startHour && item.hour <= endHour && item.volume < limit) {
                const patternIndex = item.hour - startHour;
                if(patternIndex < pattern.length) {
                  // The weight for redistribution should be how much "room" is left.
                  totalUnderLimitWeight += (limit - item.volume);
                }
            }
        });

        // Redistribute the excess volume proportionally to the hours under the limit
        if(totalUnderLimitWeight > 0.01){
            allocation.forEach(item => {
                if (item.hour >= startHour && item.hour <= endHour && item.volume < limit) {
                    const room = limit - item.volume;
                    const share = excessVolume * (room / totalUnderLimitWeight);
                    item.volume += share;
                }
            });
        } else {
             // If all hours are at the limit, we cannot redistribute.
             overflowWarning = "Hourly volume limit exceeded.";
             break;
        }
    } else {
      break; // No excess volume, distribution is fine
    }
  }
  
  // Final check for overflow after redistribution attempts
  if (!overflowWarning) {
    const maxAllocated = Math.max(...allocation.map(a => a.volume));
    if (maxAllocated > limit + 0.001) { // Add a small tolerance for float precision
      overflowWarning = "Hourly volume limit exceeded.";
      // Recalculate excess one last time if warning is set here
      let finalExcess = 0;
      allocation.forEach(item => {
        if(item.volume > limit) {
          finalExcess += item.volume - limit;
          item.volume = limit;
        }
      });
      // If there's still excess, it means total volume cannot be allocated.
      // This case is rare but could happen with rounding.
    }
  }


  // 3. Rounding and Final Sum Correction
  let currentTotal = 0;
  allocation.forEach(item => {
    item.volume = parseFloat(item.volume.toFixed(2));
    currentTotal += item.volume;
  });
  
  let difference = parseFloat((totalDailyVolume - currentTotal).toFixed(2));
  
  // Distribute the rounding difference to the hour with the highest volume that is not at the limit
  if (difference !== 0) {
     const eligibleHours = allocation
        .map((item, index) => ({...item, index}))
        .filter(item => item.hour >= startHour && item.hour <= endHour && item.volume < limit)
        .sort((a,b) => b.volume - a.volume);

      if(eligibleHours.length > 0 && eligibleHours[0].index < allocation.length) {
        allocation[eligibleHours[0].index].volume = parseFloat((allocation[eligibleHours[0].index].volume + difference).toFixed(2));
      } else {
        // If all are at the limit, add to the first operating hour and trigger warning
        const firstHourIndex = allocation.findIndex(a => a.hour === startHour);
        if (firstHourIndex !== -1) {
          allocation[firstHourIndex].volume = parseFloat((allocation[firstHourIndex].volume + difference).toFixed(2));
          overflowWarning = "Hourly volume limit exceeded.";
        }
      }
  }
  
  return {
    allocation: allocation.map(a => ({hour: a.hour, volume: parseFloat(a.volume.toFixed(2))})),
    overflowWarning,
  };
}
