"use server";
// import { autoDetectXmlConfig as autoDetectXmlConfigFlow, type AutoDetectXmlConfigInput, type AutoDetectXmlConfigOutput } from '@/ai/flows/auto-detect-xml-config'; // Removed
import { suggestColumnValues as suggestColumnValuesFlow, type SuggestColumnValuesInput, type SuggestColumnValuesOutput } from '@/ai/flows/suggest-column-values';

// Removed detectXmlConfigAction
// export async function detectXmlConfigAction(input: AutoDetectXmlConfigInput): Promise<AutoDetectXmlConfigOutput> {
//   try {
//     const result = await autoDetectXmlConfigFlow(input);
//     return result;
//   } catch (error) {
//     console.error("Error in detectXmlConfigAction:", error);
//     throw new Error("Failed to detect XML configuration. Please try again.");
//   }
// }

export async function suggestColValuesAction(input: SuggestColumnValuesInput): Promise<SuggestColumnValuesOutput> {
  try {
    const result = await suggestColumnValuesFlow(input);
    return result;
  } catch (error) {
    console.error("Error in suggestColValuesAction:", error);
    throw new Error("Failed to suggest column values. Please try again.");
  }
}
