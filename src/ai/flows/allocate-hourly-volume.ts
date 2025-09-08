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
  prompt: `You are a resource allocation expert. Given the total daily volume and the selected well, create a JSON array of 24 objects representing each hour of the day (0-23) and its allocated water volume.

The final response must be a single JSON array of 24 objects. Each object must have "hour" (0-23) and "volume" keys. Do not add any extra explanations.

Total Daily Volume: {{{totalDailyVolume}}}
Well: {{{well}}}

The volume for each hour should vary throughout the 24 hours (0-23). The sum of all 24 hourly volumes (from hour 0 to 23) must exactly equal the 'totalDailyVolume'. The volume for each hour must not be the same.

Follow these specific operating hours:
- If the well is "MAAG", distribute the volume only between the hours of 6 and 18 (inclusive). All other hours must have a volume of 0.
- If the well is "PECUÁRIA", distribute the volume only between the hours of 6 and 21 (inclusive). All other hours must have a volume of 0.
- For any other well, use typical water usage patterns to determine the operating hours, leaving non-operating hours with a volume of 0.
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
