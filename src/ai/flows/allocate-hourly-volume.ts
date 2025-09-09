'use server';

/**
 * @fileOverview Automatically divides the total daily volume into hourly allocations that vary throughout the day.
 *
 * - allocateHourlyVolume - A function that handles the allocation process.
 * - AllocateHourlyVolumeInput - The input type for the allocateHourlyVolume function.
 * - AllocateHourlyVolumeOutput - The return type for the allocateHourlyVolume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { allocateVolume } from '@/services/allocation-service';

const AllocateHourlyVolumeInputSchema = z.object({
  totalDailyVolume: z
    .number()
    .describe('The total volume in cubic meters for the entire day.'),
  well: z
    .string()
    .describe(
      'The well from which the water is being drawn (e.g., MAAG, PECUÁRIA, TCHE).'
    ),
});
export type AllocateHourlyVolumeInput = z.infer<
  typeof AllocateHourlyVolumeInputSchema
>;

const AllocateHourlyVolumeOutputSchema = z.object({
  allocation: z.array(
    z.object({
      hour: z.number().describe('The hour of the day (0-23).'),
      volume: z
        .number()
        .describe('The allocated volume in cubic meters for this hour.'),
    })
  ),
  overflowWarning: z
    .string()
    .optional()
    .describe(
      'A warning message if the hourly volume for a well exceeds its specific limit.'
    ),
});

export type AllocateHourlyVolumeOutput = z.infer<
  typeof AllocateHourlyVolumeOutputSchema
>;

export async function allocateHourlyVolume(
  input: AllocateHourlyVolumeInput
): Promise<AllocateHourlyVolumeOutput> {
  return allocateHourlyVolumeFlow(input);
}

const allocateHourlyVolumeFlow = ai.defineFlow(
  {
    name: 'allocateHourlyVolumeFlow',
    inputSchema: AllocateHourlyVolumeInputSchema,
    outputSchema: AllocateHourlyVolumeOutputSchema,
  },
  async ({ totalDailyVolume, well }) => {
    // Delegate the complex allocation logic to a deterministic TypeScript service.
    return allocateVolume(totalDailyVolume, well);
  }
);
