'use server';
/**
 * @fileOverview Suggests values for a given column based on the data in the file.
 *
 * - suggestColumnValues - A function that handles the suggestion of column values.
 * - SuggestColumnValuesInput - The input type for the suggestColumnValues function.
 * - SuggestColumnValuesOutput - The return type for the suggestColumnValues function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestColumnValuesInputSchema = z.object({
  columnName: z.string().describe('The name of the column to suggest values for.'),
  existingValues: z.array(z.string()).describe('The existing values in the column.'),
  allData: z.string().describe('All data from the file, as a string.'),
});
export type SuggestColumnValuesInput = z.infer<typeof SuggestColumnValuesInputSchema>;

const SuggestColumnValuesOutputSchema = z.object({
  suggestedValues: z.array(z.string()).describe('Suggested values for the column.'),
});
export type SuggestColumnValuesOutput = z.infer<typeof SuggestColumnValuesOutputSchema>;

export async function suggestColumnValues(input: SuggestColumnValuesInput): Promise<SuggestColumnValuesOutput> {
  return suggestColumnValuesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestColumnValuesPrompt',
  input: {schema: SuggestColumnValuesInputSchema},
  output: {schema: SuggestColumnValuesOutputSchema},
  prompt: `You are an AI assistant helping to suggest values for a specific column in a dataset.

The column name is: {{{columnName}}}

Existing values in the column are:
{{#each existingValues}}
- {{{this}}}
{{/each}}

All data from the file is:
{{{allData}}}

Based on the existing values and the overall data, suggest values that would be appropriate for this column.
Return only an array of suggested values. If existingValues are empty, use the allData to determine possible values.
Do not repeat values already present in existingValues.
Suggest at least 5 values.
`,
});

const suggestColumnValuesFlow = ai.defineFlow(
  {
    name: 'suggestColumnValuesFlow',
    inputSchema: SuggestColumnValuesInputSchema,
    outputSchema: SuggestColumnValuesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
