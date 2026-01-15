'use server';

/**
 * @fileOverview Generates dynamic reports based on user input, using AI to conditionally incorporate information based on logical comparisons.
 *
 * - generateDynamicReport - A function that handles the dynamic report generation process.
 * - DynamicReportInput - The input type for the generateDynamicReport function.
 * - DynamicReportOutput - The return type for the generateDynamicReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DynamicReportInputSchema = z.object({
  reportTitle: z.string().describe('The title of the report.'),
  dataPoints: z.array(
    z.object({
      label: z.string().describe('The label for the data point.'),
      value: z.string().describe('The value for the data point.'),
    })
  ).describe('An array of data points to include in the report.'),
  additionalContext: z.string().optional().describe('Any additional context or information to consider for the report.'),
});

export type DynamicReportInput = z.infer<typeof DynamicReportInputSchema>;

const DynamicReportOutputSchema = z.object({
  reportContent: z.string().describe('The generated report content.'),
});

export type DynamicReportOutput = z.infer<typeof DynamicReportOutputSchema>;

const decideToIncludeTool = ai.defineTool({
  name: 'decideToInclude',
  description: 'Decides whether to include a specific data point in the report based on its relevance and context.',
  inputSchema: z.object({
    label: z.string().describe('The label of the data point.'),
    value: z.string().describe('The value of the data point.'),
    context: z.string().describe('The overall context of the report.'),
  }),
  outputSchema: z.boolean().describe('Whether to include the data point (true) or not (false).'),
}, async (input) => {
  // Implement the logic to decide whether to include the data point.
  // This could involve checking if the value is within a certain range,
  // if the label matches certain keywords, or if the context suggests it is relevant.
  // For now, let's just include it if the value is not empty.
  return input.value !== '';
});


export async function generateDynamicReport(input: DynamicReportInput): Promise<DynamicReportOutput> {
  return dynamicReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dynamicReportPrompt',
  tools: [decideToIncludeTool],
  input: {schema: DynamicReportInputSchema},
  output: {schema: DynamicReportOutputSchema},
  prompt: `You are an AI report generator. Your task is to create a comprehensive report based on the provided data points and context.

Report Title: {{{reportTitle}}}

Additional Context: {{{additionalContext}}}

Data Points:
{{#each dataPoints}}
  {{#if (decideToInclude label=this.label value=this.value context=../additionalContext)}}
    - {{{this.label}}}: {{{this.value}}}
  {{/if}}
{{/each}}

Please generate a report based on the included data points and the additional context. Make the report as insightful and relevant as possible.
`
});

const dynamicReportFlow = ai.defineFlow(
  {
    name: 'dynamicReportFlow',
    inputSchema: DynamicReportInputSchema,
    outputSchema: DynamicReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
