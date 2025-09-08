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

{{#if isMaagWell}}
The allocation for the "MAAG" well must follow these specific rules:
1.  **Active Hours:** The water volume is distributed ONLY between the hours of 6 (6:00) and 18 (18:59).
2.  **Inactive Hours:** The 'volume' for all other hours (0-5 and 19-23) must be explicitly set to 0.
3.  **Hourly Distribution Rules:**
    - The hourly volumes for hours 6, 7, 8, 9, 10, 11, and 12 must all be the same value (let's call this Value A).
    - The hourly volumes for hours 13, 14, and 15 must be different from each other (let's call these Value B, Value C, Value D).
    - The hourly volumes for hours 16, 17, and 18 must all be the same value (let's call this Value E).
4.  **CRITICAL SUMMATION RULE:** The sum of the unique representative volumes MUST equal the 'totalDailyVolume'.
    - **Calculation:** (Value A) + (Value B) + (Value C) + (Value D) + (Value E) = totalDailyVolume.
    - **Example:** If totalDailyVolume is 100, a valid distribution could be A=50, B=10, C=15, D=5, E=20. The sum is 50+10+15+5+20 = 100.
    - You must first determine these 5 values (A, B, C, D, E) whose sum is totalDailyVolume, and then use them to build the final 24-hour array.
{{else}}
For other wells, the volume for each hour should vary throughout the 24 hours (0-23) based on typical daily water usage patterns, and the sum of all 24 hourly volumes (from hour 0 to 23) must exactly equal the 'totalDailyVolume'.
{{/if}}
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

const allocateHourlyVolumeFlow = ai.defineFlow(
  {
    name: 'allocateHourlyVolumeFlow',
    inputSchema: AllocateHourlyVolumeInputSchema,
    outputSchema: AllocateHourlyVolumeOutputSchema,
  },
  async input => {
    const {output} = await prompt({
      ...input,
      isMaagWell: input.well === 'MAAG',
    });
    return output!;
  }
);
