// src/app/api/detect-xml-structure/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { streamText, CoreMessage, generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider'; // Import for OpenRouter

// --- Constants for API Providers ---
const REQUESTY_AI_PROVIDER = 'requesty.ai';
const OPENROUTER_AI_PROVIDER = 'openrouter.ai';

// --- Environment Variables ---
const REQUESTY_API_KEY = process.env.REQUESTY_API_KEY;
const REQUESTY_MODEL_ID = process.env.REQUESTY_MODEL_ID; // e.g., "rag-custom-model-preset"
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// --- Zod Schemas ---

// Schema for individual mapping
const AiMappingSchema = z.object({
  fieldName: z.string().describe('The conceptual name of the field (e.g., "Product Name", "Price", "Color"). Use the text content of name-like elements if dealing with dynamic attributes.'),
  xpath: z.string().describe('The XPath expression to extract the field"s value. For dynamic attributes, this XPath should select the value based on its corresponding name (e.g., "attributes/attribute[name=\"Color\"]/value/text()").'),
  description: z.string().optional().describe('A brief explanation of what this field represents or any special handling notes.'),
  isDynamicKeyValuePair: z.boolean().optional().default(false).describe('Set to true if this mapping represents one part of a dynamic key-value pair structure that was specifically handled.'),
});

// New: Schema for how to extract a key in a dynamic block
const AiDynamicBlockKeySourceSchema = z.object({
  from: z.enum(['attribute', 'childElementText', 'repeatingElementText']),
  identifier: z.string().optional().describe("If 'attribute', the name of the attribute (e.g., 'name'). If 'childElementText', the tag name of the child element (e.g., 'key'). Not used if 'repeatingElementText'."),
});

// New: Schema for how to extract a value in a dynamic block
const AiDynamicBlockValueSourceSchema = z.object({
  from: z.enum(['attribute', 'childElementText', 'repeatingElementText', 'text']),
  identifier: z.string().optional().describe("If 'attribute', the name of the attribute. If 'childElementText', the tag name of the child element. Can be omitted if 'repeatingElementText' or if value is direct text content of repeating element."),
});

// New: Schema for a detected dynamic block
const AiDynamicBlockExtractionSchema = z.object({
  repeatingElementXPath: z.string().describe("The XPath to the repeating elements that form the key-value pairs (e.g., '/product/attributes/attribute' or '/item/features/feature')."),
  keySource: AiDynamicBlockKeySourceSchema.describe("Describes how to extract the 'key' (field name) from each repeating element."),
  valueSource: AiDynamicBlockValueSourceSchema.describe("Describes how to extract the 'value' from each repeating element."),
  exampleMappings: z.array(AiMappingSchema).optional().describe('Up to 3-5 example mappings (fieldName, xpath) derived from this dynamic block structure and the provided XML sample.'),
});

// Main response schema from the AI
const AiResponseSchema = z.object({
  itemRootPath: z.string().optional().describe('The common XPath prefix for all items/products in the XML. If not easily identifiable, this can be omitted.'),
  suggestedMappings: z.array(AiMappingSchema).optional().describe('An array of suggested field mappings for standard, non-dynamic fields. If detectionMode is dynamicBlock, this should contain all fields EXCEPT the ones covered by the dynamicBlockMapping.'),
  dynamicBlockMapping: AiDynamicBlockExtractionSchema.optional().describe('Describes a single, primary detected dynamic key-value pattern. Only used if detectionMode is dynamicBlock. This should NOT duplicate mappings found in suggestedMappings.'),
  promptModeUsed: z.enum(['detailedFields', 'dynamicBlock', '']).describe('The mode used for this detection response.'),
  rawAiResponse: z.string().optional().describe('The raw string response from the AI model, for debugging.'),
  provider: z.string().optional().describe('The AI provider used (e.g., openrouter.ai, requesty.ai).'),
});

// New: Detection mode schema
const DetectionModeSchema = z.enum(['detailedFields', 'dynamicBlock']).default('detailedFields');

// Updated: Request schema
const XmlDetectionRequestSchema = z.object({
  xmlSample: z.string().min(50, { message: 'XML sample must be at least 50 characters long.' })
    .max(20000, { message: 'XML sample must not exceed 20,000 characters.' }),
  apiProvider: z.enum([REQUESTY_AI_PROVIDER, OPENROUTER_AI_PROVIDER]).default(OPENROUTER_AI_PROVIDER),
  detectionMode: DetectionModeSchema,
  stream: z.boolean().optional().default(false),
  model: z.string().optional(), // Ensure 'model' is part of the schema
});

// --- System Prompts ---

const SYSTEM_PROMPT_SHARED_HEADER = 'You are an expert XML and XPath analyst. Your task is to analyze a given XML sample that represents a single item or a list of items (e.g., products, articles, records).';

const SYSTEM_PROMPT_SHARED_FOOTER = `
Provide your response as a VALID JSON object adhering to the specified output schema.
Focus on extracting meaningful data fields. Avoid generic structural elements unless they clearly represent a data field.
If the XML contains arrays or repeating elements for a field (e.g., multiple images, categories), provide an XPath that targets all instances (e.g., "/product/images/image/@url" or "/product/categories/category/text()").
Use relative XPath expressions from the 'itemRootPath' if one is identified and makes sense. If no clear single item root is obvious, use absolute XPaths.
Ensure all generated XPaths are valid.
Do not include any explanations or text outside of the JSON structure.
If you cannot parse the XML or determine mappings, return a JSON with an "error" field explaining the issue.
`;

const DETAILED_SYSTEM_PROMPT = `
${SYSTEM_PROMPT_SHARED_HEADER}
Your goal is to identify key data fields and provide precise XPath expressions to extract their values.

Output Schema (JSON):
{
  "itemRootPath": "string (Optional: Common XPath root for a single item, e.g., '/products/product')",
  "mappings": [
    {
      "fieldName": "string (Conceptual name, e.g., 'Product Name', 'Price', 'Color')",
      "xpath": "string (XPath to extract value, e.g., 'name/text()', '@price', 'attributes/attribute[name="Color"]/value/text()')",
      "description": "string (Optional: Notes)",
      "isDynamicKeyValuePair": "boolean (Optional: true if this is part of a handled dynamic key-value pair)"
    }
  ],
  "rawAiResponse": "string (Optional: For debugging, include your original full text response before JSON parsing if possible)"
}

Key fields to look for (adapt to the XML's content):
- Unique identifiers (ID, SKU, EAN)
- Product/Item Name or Title
- Description
- Pricing information (price, currency, sale price)
- Brand or Manufacturer
- URLs (product page, images)
- Stock or availability information
- Category information
- Any other fields that appear to be significant based on the XML structure

Special Handling for Dynamic Attributes/Key-Value Pairs (Type 1 - Name/Value Sibling Elements):
Sometimes, field names are not direct XML element names but are contained within the text of an element, often paired with a corresponding value element. This is common for product attributes or specifications.
For example:
<attributes>
  <attribute>
    <name>Color</name>
    <value>Red</value>
  </attribute>
  <attribute>
    <name>Size</name>
    <label>Large</label> <!-- Note: the value element might be named 'value', 'label', or similar -->
  </attribute>
</attributes>
In such cases, if you identify a repeating parent element (e.g., 'attribute') that consistently contains:
  a) one sub-element holding the field's conceptual name (e.g., 'name'), and
  b) another sub-element holding that field's value (e.g., 'value', 'label'),
you MUST:
1. Use the text content of the 'name' sub-element (e.g., "Color", "Size") as the 'fieldName' in your JSON output.
2. Construct an XPath that specifically selects the 'value' or 'label' sub-element based on the text content of its sibling 'name' sub-element.
   For "Color" example (itemRootPath '/product'): "attributes/attribute[name="Color"]/value/text()".
   For "Size" example: "attributes/attribute[name="Size"]/label/text()".
   Set "isDynamicKeyValuePair" to true for these mappings.
Adapt tag names ('attributes', 'attribute', 'name', 'value', 'label') to match the XML.
Do NOT generate XPaths for container attributes like 'id' on the repeating parent element unless they represent actual data fields.

Special Handling for Dynamic Attributes/Key-Value Pairs (Type 2 - Key in Attribute, Value in Text):
Another pattern is where the key is in an attribute of an element, and the value is the text content of that same element.
For example:
<features>
  <feature name="Material">Cotton</feature>
  <feature name="Weight">200g</feature>
</features>
In such cases:
1. Use the value of the 'name' attribute (e.g., "Material", "Weight") as the 'fieldName'.
2. Construct an XPath that selects the text content of the element based on its 'name' attribute.
   For "Material" example (itemRootPath '/product'): "features/feature[@name='Material']/text()".
   Set "isDynamicKeyValuePair" to true for these mappings.
Adapt tag names ('features', 'feature', 'name') to match the XML.
${SYSTEM_PROMPT_SHARED_FOOTER}
`;

const SYSTEM_PROMPT_DYNAMIC_BLOCKS = `
You are an expert in XML data extraction and XPath generation, tasked with analyzing a sample XML structure to identify field mappings for a data conversion tool. The user wants to detect ONE primary dynamic key-value attribute block and all other standard/static fields.

Your goal is to return a JSON object adhering to the following Zod schema:

{
  "itemRootPath": "string (Required: Full XPath prefix leading to each individual item/product element, e.g., '/catalog/products/product')",
  "suggestedMappings": [
    {
      "fieldName": "string (Conceptual name, e.g., 'Product Name', 'Price', 'Color')",
      "xpath": "string (XPath to extract value, e.g., 'name/text()', '@price', 'attributes/attribute[name="Color"]/value/text()')",
      "description": "string (Optional: Notes)",
      "isDynamicKeyValuePair": "boolean (Optional: true if this is part of a handled dynamic key-value pair)"
    }
  ],
  "dynamicBlockMapping": {
    "repeatingElementXPath": "string (XPath to the repeating elements that form the key-value pairs, e.g., '/product/attributes/attribute' or '/item/features/feature')",
    "keySource": {
      "from": "enum ('attribute', 'childElementText', 'repeatingElementText')",
      "identifier": "string (Optional: If 'attribute', the name of the attribute. If 'childElementText', the tag name of the child element. Not used if 'repeatingElementText'.)"
    },
    "valueSource": {
      "from": "enum ('attribute', 'childElementText', 'repeatingElementText', 'text')",
      "identifier": "string (Optional: If 'attribute', the name of the attribute. If 'childElementText', the tag name of the child element. Can be omitted if 'repeatingElementText' or if value is direct text content of repeating element.)"
    },
    "exampleMappings": [
      {
        "fieldName": "string (Actual field name extracted, e.g., 'Color', 'Material')",
        "xpath": "string (Full XPath to its VALUE, relative to itemRootPath if applicable)",
        "description": "string (Optional: Notes for this specific example)",
        "isDynamicKeyValuePair": "boolean (Should be true for these examples)"
      }
    ]
  },
  "promptModeUsed": "enum ('detailedFields', 'dynamicBlock', '')",
  "rawAiResponse": "string (Optional: For debugging)"
}

Key Instructions for 'dynamicBlock' mode:

1.  **Identify Standard Fields:** Find ALL regular, non-dynamic fields. These can be:
    *   Direct text content of child elements (e.g., 'name/text()', 'description/text()').
    *   Attributes of the item element itself (e.g., '@id', '@url').
    *   Values within specific, non-repeating child structures (e.g., 'images/main_image/@url', 'gallery/image/@source', 'category_path/main_category/text()').
    For each, create a mapping object and place it in the 'suggestedMappings' array. The 'xpath' should be a standard XPath expression to extract its value. 'isDynamicKeyValuePair' should be false or omitted for these standard fields.

2.  **Identify the Primary Dynamic Key-Value Block:**
    *   Determine the 'repeatingElementXPath' for the elements that form the dynamic key-value pairs (e.g., '/product/attributes/attribute').
    *   Define 'keySource': How to get the KEY (field name) of the attribute from each repeating element.
        *   'from': 'attribute' (key is an XML attribute of the repeating element), 'childElementText' (key is the text of a child element), or 'repeatingElementText'.
        *   'identifier': If 'from' is 'attribute', this is the attribute's name (e.g., "name", "key"). If 'from' is 'childElementText', this is the tag name of the child element holding the key (e.g., "keyName", "attrName").
    *   Define 'valueSource': How to get the VALUE of the attribute within each repeating element.
        *   'from': 'attribute', 'childElementText', 'repeatingElementText', or 'text'.
        *   'identifier': Similar to 'keySource.identifier', but for the value part.
    *   'exampleMappings': Provide 2-3 EXAMPLES of concrete mappings that would result from this dynamic pattern (e.g., if key is 'Color' and value is 'Blue', one example would have fieldName: 'Color', xpath: '...predicate for Color...'). For these examples ONLY:
        *   Set 'isDynamicKeyValuePair' to 'true'.
        *   These illustrative 'exampleMappings' are part of the 'dynamicBlockMapping' object and MUST NOT be duplicated in the main 'suggestedMappings' array.

3.  **itemRootPath:** Determine the full, common XPath prefix leading to each individual item/product element (e.g., if items are at '/catalog/products/product', then itemRootPath is '/catalog/products/product'). THIS IS REQUIRED OUTPUT.

CRITICAL: The 'suggestedMappings' array MUST ONLY contain mappings for standard, fixed fields that are NOT part of the dynamic block defined in 'dynamicBlockMapping'. The 'dynamicBlockMapping.exampleMappings' array is for illustrating the dynamic pattern itself. DO NOT list the dynamic attributes found by the pattern in 'suggestedMappings'.

Input XML will be provided by the user.
`;

// --- Main POST Handler ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = XmlDetectionRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validationResult.error.flatten() }, { status: 400 });
    }

    const { xmlSample, apiProvider, detectionMode, stream, model: modelIdFromRequest } = validationResult.data;
    const userMessageContent = `XML Sample:\n---XML START---\n${xmlSample}\n---XML END---\nPlease analyze this XML based on the detection mode: ${detectionMode}.`;

    let systemPrompt = '';
    if (detectionMode === 'detailedFields') {
      systemPrompt = DETAILED_SYSTEM_PROMPT;
    } else if (detectionMode === 'dynamicBlock') {
      systemPrompt = SYSTEM_PROMPT_DYNAMIC_BLOCKS;
    } else {
      return NextResponse.json({ error: 'Invalid detection mode specified.' }, { status: 400 });
    }
    
    const messages: CoreMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessageContent },
    ];

    if (apiProvider === OPENROUTER_AI_PROVIDER) {
      if (!OPENROUTER_API_KEY) {
        return NextResponse.json({ error: 'OpenRouter API key not configured.' }, { status: 500 });
      }
      const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });
      const modelId = modelIdFromRequest || 'openai/gpt-3.5-turbo';

      if (stream) {
        const streamResult = await streamText({
          model: openrouter(modelId),
          messages,
          onFinish: async ({ text }) => {
            try {
              const parsedJson = JSON.parse(text);
              const finalResponse = { ...parsedJson, promptModeUsed: detectionMode, rawAiResponse: text, provider: OPENROUTER_AI_PROVIDER, model: modelId };
              // Consider adding validation here if needed for streamed complete responses
            } catch (e) {
              console.error('[OpenRouter Streaming] Error parsing AI JSON onFinish:', e);
            }
          },
        });
        return streamResult.toDataStreamResponse();
      } else { // Non-streaming OpenRouter
        const { object, finishReason, usage } = await generateObject({
            model: openrouter(modelId),
            messages,
            schema: AiResponseSchema, 
        });
        
        // 'object' is already the parsed JSON object according to the schema
        const aiContentObject = object;
        
        console.log('OpenRouter - Parsed Object from generateObject:', aiContentObject);

        const finalResponseData = { ...object, promptModeUsed: detectionMode, rawAiResponse: JSON.stringify(object), provider: OPENROUTER_AI_PROVIDER, model: modelId };
        
        console.log('--- DEBUG: FINAL RESPONSE TO CLIENT (OpenRouter generateObject) ---');
        console.log(JSON.stringify(finalResponseData, null, 2));
        console.log('--- END DEBUG ---');

        const parsedAiResponse = AiResponseSchema.safeParse(finalResponseData);

        if (!parsedAiResponse.success) {
          console.error('OpenRouter - Zod validation error after generateObject:', parsedAiResponse.error.flatten());
          return NextResponse.json({ error: 'AI response validation failed', details: parsedAiResponse.error.flatten(), rawResponse: finalResponseData.rawAiResponse }, { status: 500 });
        }
        return NextResponse.json(parsedAiResponse.data, { status: 200 });
      }
    } else if (apiProvider === REQUESTY_AI_PROVIDER) {
      if (!REQUESTY_API_KEY || !REQUESTY_MODEL_ID) {
        return NextResponse.json({ error: 'Requesty.ai API key or Model ID not configured.' }, { status: 500 });
      }

      const requestyUrl = `https://api.requesty.ai/v1/completions`; 
      const requestyModelIdToUse = REQUESTY_MODEL_ID; 

      console.log(`Requesty.ai - Using URL: ${requestyUrl}`);
      console.log(`Requesty.ai - Using Model ID: ${requestyModelIdToUse}`);
      
      const messagesForRequesty: CoreMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the XML sample to analyze:\n\n${xmlSample}` },
      ];

      const requestyPayload = {
        apiKey: REQUESTY_API_KEY, 
        messages: messagesForRequesty.map(m => ({ role: m.role, content: m.content as string })),
        model: requestyModelIdToUse,
        stream: false,
        format: 'json' 
      };

      try {
        const response = await fetch(requestyUrl, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestyPayload),
        });

        console.log(`Requesty.ai - Response Status: ${response.status}`);

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Requesty.ai API Error (${response.status}):`, errorBody);
          return NextResponse.json({ error: `Requesty.ai API request failed with status ${response.status}`, details: errorBody, provider: REQUESTY_AI_PROVIDER }, { status: response.status });
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const aiResponseJson = await response.json();
            console.log('Requesty.ai - Raw AI Response JSON:', JSON.stringify(aiResponseJson).substring(0,1000));

            const aiContentString = aiResponseJson.choices?.[0]?.message?.content || aiResponseJson.prediction || JSON.stringify(aiResponseJson);
            console.log('Requesty.ai - Extracted AI content:', aiContentString.substring(0, 500) + (aiContentString.length > 500 ? '...' : ''));

            let parsedJsonContent;
            try {
                parsedJsonContent = JSON.parse(aiContentString);
            } catch (e) {
                console.error('[Requesty.ai] Error parsing AI JSON content:', e);
                console.log('[Requesty.ai] Raw AI content string:', aiContentString);
                return NextResponse.json({ error: 'Requesty.ai response content is not valid JSON.', details: aiContentString }, { status: 500 });
            }

            const finalResponseData = { ...parsedJsonContent, promptModeUsed: detectionMode, rawAiResponse: aiContentString, provider: REQUESTY_AI_PROVIDER, model: requestyModelIdToUse };
            const parsedAiResponse = AiResponseSchema.safeParse(finalResponseData);

            if (!parsedAiResponse.success) {
                console.error('Requesty.ai - Zod validation error:', parsedAiResponse.error.flatten());
                return NextResponse.json({ error: 'AI response validation failed for Requesty.ai', details: parsedAiResponse.error.flatten(), rawResponse: aiContentString }, { status: 500 });
            }
            return NextResponse.json(parsedAiResponse.data, { status: 200 });
        } else {
            const textResponse = await response.text();
            console.error('Requesty.ai - Unexpected Content-Type:', contentType, textResponse);
            return NextResponse.json({ error: 'Requesty.ai returned unexpected content type.', details: textResponse }, { status: 500 });
        }
      } catch (error: any) {
        console.error('Error calling Requesty.ai API:', error);
        return NextResponse.json({ error: 'Failed to call Requesty.ai API.', details: (error as Error).message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid API provider.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in /api/detect-xml-structure:', error);
    return NextResponse.json({ error: 'Internal server error.', details: error.message }, { status: 500 });
  }
}
