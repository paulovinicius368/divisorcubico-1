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
  input: {schema: AllocateHourlyVolumeInputSchema},
  output: {schema: AllocateHourlyVolumeOutputSchema},
  prompt: `You are a resource allocation expert. Given the total daily volume and the selected well, allocate it to each hour of the day.

The total volume across all hours must equal the totalDailyVolume.

Total Daily Volume: {{{totalDailyVolume}}}
Well: {{{well}}}

{{#if (eq well "MAAG")}}
The allocation for the "MAAG" well must follow these specific rules:
- The total volume must be distributed only between the hours of 6 (6:00) and 18 (18:59). All other hours (0-5 and 19-23) must have a volume of 0.
- The hourly volume must be the same for the hours from 6 to 12.
- The hourly volume for hours 13, 14, and 15 must be different from each other and from the 6-12 period.
- The hourly volume for hours 16, 17, and 18 must be the same as the volume for hour 15.
{{else}}
The volume for each hour should vary throughout the 24 hours (0-23) based on typical daily water usage patterns.
{{/if}}

Ensure the response is a JSON array of 24 objects. Each object must have "hour" (0-23) and "volume" keys.
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
    const {output} = await prompt(input);
    return output!;
  }
);
