
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

  const operationalHours = endHour - startHour + 1;
  const patternSum = pattern.slice(0, operationalHours).reduce((sum, p) => sum + p, 0);

  // Initial distribution
  let allocation = Array.from({ length: 24 }, (_, hour) => {
    let volume = 0;
    if (hour >= startHour && hour <= endHour) {
      const patternIndex = hour - startHour;
      const weight = pattern[patternIndex] || 0;
      if (patternSum > 0) {
        volume = (totalDailyVolume * weight) / patternSum;
      }
    }
    return { hour, volume, atLimit: false };
  });

  let overflowWarning: string | undefined = undefined;

  // Iteratively redistribute excess volume
  for (let i = 0; i < 10; i++) { // More iterations for better smoothing
    let totalExcess = 0;
    
    // Calculate excess and cap volumes
    allocation.forEach(item => {
      if (!item.atLimit && item.volume > limit) {
        totalExcess += item.volume - limit;
        item.volume = limit;
        item.atLimit = true;
      }
    });

    if (totalExcess < 0.01) {
      break; // No more excess to redistribute
    }

    const availableHoursForRedistribution = allocation.filter(item => !item.atLimit && item.hour >= startHour && item.hour <= endHour);
    if (availableHoursForRedistribution.length === 0) {
      overflowWarning = "Hourly volume limit exceeded.";
      break; // No hours available to take on more volume
    }

    const totalCapacity = availableHoursForRedistribution.reduce((sum, item) => sum + (limit - item.volume), 0);

    if (totalCapacity < totalExcess) {
      // Distribute what we can, the rest is overflow
      availableHoursForRedistribution.forEach(item => {
        const proportion = (limit - item.volume) / totalCapacity;
        item.volume += totalExcess * proportion;
      });
      overflowWarning = "Hourly volume limit exceeded.";
      break;
    } else {
      // Redistribute the excess proportionally to the remaining capacity
      availableHoursForRedistribution.forEach(item => {
          if (totalCapacity > 0) {
            const proportion = (limit - item.volume) / totalCapacity;
            item.volume += totalExcess * proportion;
          }
      });
    }
  }


  // Final Sum Correction due to floating point math
  let currentTotal = allocation.reduce((sum, item) => sum + item.volume, 0);
  let difference = totalDailyVolume - currentTotal;
  
  if (Math.abs(difference) > 0.001) {
    const eligibleForCorrection = allocation
        .map((item, index) => ({...item, index}))
        .filter(item => item.hour >= startHour && item.hour <= endHour && !item.atLimit)
        .sort((a,b) => b.volume - a.volume);
    
    if (eligibleForCorrection.length > 0) {
        const targetIndex = eligibleForCorrection[0].index;
        allocation[targetIndex].volume += difference;
    } else {
        // If all are at limit, add to the first operational hour
        const firstHourIndex = allocation.findIndex(a => a.hour === startHour);
        if (firstHourIndex !== -1) {
             allocation[firstHourIndex].volume += difference;
             if (allocation[firstHourIndex].volume > limit) {
                 overflowWarning = "Hourly volume limit exceeded.";
             }
        }
    }
  }

  // Final check for any hour exceeding the limit after all corrections
  const finalMaxVolume = Math.max(...allocation.map(a => a.volume));
  if (finalMaxVolume > limit + 0.001) { // Add tolerance
      overflowWarning = "Hourly volume limit exceeded.";
      // Final cap, as redistribution failed.
      allocation.forEach(item => {
          if(item.volume > limit) {
              item.volume = limit;
          }
      });
  }

  return {
    allocation: allocation.map(a => ({hour: a.hour, volume: parseFloat(a.volume.toFixed(2))})),
    overflowWarning,
  };
}
