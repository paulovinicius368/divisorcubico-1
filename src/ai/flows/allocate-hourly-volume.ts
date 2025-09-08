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

const AllocateHourlyVolumeOutputSchema = z.array(
  z.object({
    hour: z.number().describe('The hour of the day (0-23).'),
    volume: z
      .number()
      .describe('The allocated volume in cubic meters for this hour.'),
  })
);
export type AllocateHourlyVolumeOutput = z.infer<
  typeof AllocateHourlyVolumeOutputSchema
>;

export async function allocateHourlyVolume(
  input: AllocateHourlyVolumeInput
): Promise<AllocateHourlyVolumeOutput> {
  return allocateHourlyVolumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'allocateHourlyVolumePrompt',
  input: {schema: z.any()},
  output: {schema: AllocateHourlyVolumeOutputSchema},
  prompt: `You are a resource allocation expert. Given the total daily volume and the selected well, create a JSON array of 24 objects representing each hour of the day (0-23) and its allocated water volume.

The final response must be a single JSON array of 24 objects. Each object must have "hour" (0-23) and "volume" keys. Do not add any extra explanations.

Total Daily Volume: {{{totalDailyVolume}}}
Well: {{{well}}}

For the selected well, the volume for each hour should vary throughout the 24 hours (0-23) based on typical daily water usage patterns, and the sum of all 24 hourly volumes (from hour 0 to 23) must exactly equal the 'totalDailyVolume'.
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

function allocateMaagVolume(
  totalDailyVolume: number
): AllocateHourlyVolumeOutput {
  // 1. Generate 5 random values for A, B, C, D, E
  let a = Math.random();
  let b = Math.random();
  let c = Math.random();
  let d = Math.random();
  let e = Math.random();

  // 2. Calculate the sum of these random values
  const randomSum = a + b + c + d + e;

  // 3. Scale these values so their sum equals totalDailyVolume
  const scale = totalDailyVolume / randomSum;
  const valueA = a * scale;
  const valueB = b * scale;
  const valueC = c * scale;
  const valueD = d * scale;
  const valueE = e * scale;

  // 4. Build the 24-hour allocation array
  const allocation: AllocateHourlyVolumeOutput = [];
  for (let hour = 0; hour < 24; hour++) {
    let volume = 0;
    if (hour >= 6 && hour <= 12) {
      volume = valueA; // Period 1 (7 hours)
    } else if (hour === 13) {
      volume = valueB;
    } else if (hour === 14) {
      volume = valueC;
    } else if (hour === 15) {
      volume = valueD;
    } else if (hour >= 16 && hour <= 18) {
      volume = valueE; // Period 3 (3 hours)
    }
    allocation.push({ hour, volume });
  }

  return allocation;
}


const allocateHourlyVolumeFlow = ai.defineFlow(
  {
    name: 'allocateHourlyVolumeFlow',
    inputSchema: AllocateHourlyVolumeInputSchema,
    outputSchema: AllocateHourlyVolumeOutputSchema,
  },
  async input => {
    if (input.well === 'MAAG') {
      // Use deterministic TypeScript logic for MAAG well
      return allocateMaagVolume(input.totalDailyVolume);
    } else {
      // Use AI for other wells
      const {output} = await prompt(input);
      return output!;
    }
  }
);
