import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Helper function to extract/clean JSON from a string
function extractJsonFromString(str: string | null | undefined): string {
  if (!str) {
    return ''; // Return empty string if input is null, undefined, or empty
  }

  let potentialJson = str;

  // Attempt to remove common markdown fences for JSON
  // Regex for ```json ... ``` (handles optional leading/trailing newlines within content)
  const jsonMdRegex = /^```json\s*([\s\S]*?)\s*```$/m;
  // Regex for ``` ... ``` (generic code block)
  const genericMdRegex = /^```\s*([\s\S]*?)\s*```$/m;

  let match = potentialJson.match(jsonMdRegex);
  if (match && match[1]) {
    potentialJson = match[1];
  } else {
    match = potentialJson.match(genericMdRegex);
    if (match && match[1]) {
      potentialJson = match[1];
    }
  }

  // Trim whitespace from the potentially extracted JSON string
  potentialJson = potentialJson.trim();

  return potentialJson;
}

// Helper function to normalize AI response: infer itemRootPath and make mappings relative
function normalizeAiResponse(rawResponse: any): { itemRootPath?: string; mappings?: any[] } {
  let itemRootPath: string | undefined;
  let currentMappings: any[] | undefined;

  if (Array.isArray(rawResponse)) {
    // AI directly returned an array of mappings
    currentMappings = rawResponse;
    itemRootPath = undefined; // Will attempt to infer it later
    console.log('normalizeAiResponse: AI returned an array of mappings directly.');
  } else if (typeof rawResponse === 'object' && rawResponse !== null) {
    // AI returned an object, hopefully with itemRootPath and/or mappings
    itemRootPath = rawResponse.itemRootPath;
    currentMappings = rawResponse.mappings;
    console.log('normalizeAiResponse: AI returned an object, initial itemRootPath:', itemRootPath, 'initial mappings:', currentMappings);
  } else {
    // Unexpected format
    console.error('normalizeAiResponse: Unexpected rawResponse format:', rawResponse);
    return { itemRootPath: undefined, mappings: [] }; // Return a valid empty structure for schema validation
  }

  // Ensure currentMappings is an array, even if rawResponse.mappings was undefined or not an array from an object response
  if (!Array.isArray(currentMappings)) {
      console.log('normalizeAiResponse: Mappings field is missing or not an array in the AI response. Initializing to empty array.');
      currentMappings = [];
  }
  
  if (currentMappings.length === 0) {
    console.log('normalizeAiResponse: Mappings array is empty. Returning structure with potentially original itemRootPath.');
    return { itemRootPath, mappings: [] };
  }

  // Attempt to infer itemRootPath if not provided or empty,
  // and if mappings seem to contain absolute XPaths.
  if ((!itemRootPath || itemRootPath.trim() === "") && currentMappings.every(m => m.xpath && typeof m.xpath === 'string' && m.xpath.startsWith('/'))) {
    const xpaths = currentMappings.map(m => m.xpath as string);
    let longestCommonPrefix = "";

    if (xpaths.length > 0) {
      const firstPathParts = xpaths[0].substring(1).split('/'); // remove leading / and split
      for (let i = 0; i < firstPathParts.length; i++) {
        const currentPrefixCandidate = "/" + firstPathParts.slice(0, i + 1).join('/');
        // Check if this candidate is a prefix for all paths AND is not an attribute path itself
        if (!currentPrefixCandidate.includes('/@') && xpaths.every(p => p.startsWith(currentPrefixCandidate + '/') || p === currentPrefixCandidate || p.startsWith(currentPrefixCandidate + '@'))) {
          longestCommonPrefix = currentPrefixCandidate;
        } else {
          break; // Prefix no longer common or suitable
        }
      }
    }
    if (longestCommonPrefix && longestCommonPrefix.length > 1) { // Avoid just "/"
      itemRootPath = longestCommonPrefix;
      console.log(`normalizeAiResponse: Inferred itemRootPath: ${itemRootPath}`);
    } else {
      console.log('normalizeAiResponse: Could not infer a suitable itemRootPath from mappings.');
    }
  }

  // If we have an itemRootPath (either provided or inferred),
  // make mapping XPaths relative to it.
  if (itemRootPath && itemRootPath.trim() !== "" && currentMappings) { // currentMappings is guaranteed to be an array here
    const rootPathPrefix = itemRootPath.endsWith('/') ? itemRootPath : itemRootPath + '/';
    const rootPathAttrPrefix = itemRootPath; // For attributes directly on the root item, like /item@id

    const adjustedMappings = currentMappings.map(m => {
      if (m.xpath && typeof m.xpath === 'string') {
        if (m.xpath.startsWith(rootPathPrefix)) {
          let relativePath = m.xpath.substring(rootPathPrefix.length);
          // Ensure relative path is not empty, if it is, it means it was an exact match to rootPathPrefix (e.g. /products/product/)
          // which is unusual for a field, but if it happens, perhaps it should be '.' or 'text()'
          // For now, if it becomes empty, we might default to something or log it.
          // If the original path was /products/product/ and itemRootPath is /products/product, result is empty.
          // This usually means the field is the text content of the item root itself.
          // A common convention for this is '.' or 'text()'. We'll use '.' for simplicity if it becomes empty.
          return { ...m, xpath: relativePath === "" ? "." : relativePath };
        }
        // Handle attributes on the item root path element itself, e.g., itemRootPath = /product, m.xpath = /product@id
        if (m.xpath.startsWith(rootPathAttrPrefix + '@')) {
          return { ...m, xpath: m.xpath.substring(rootPathAttrPrefix.length) }; // Results in "@id"
        }
      }
      return m;
    });
    console.log('normalizeAiResponse: Mappings after attempting to make them relative:', adjustedMappings);
    return { itemRootPath, mappings: adjustedMappings };
  }
  
  console.log('normalizeAiResponse: No itemRootPath for adjustment or no adjustments made to mappings, returning current structure.');
  return { itemRootPath, mappings: currentMappings }; 
}

// Get models from environment variables for OpenRouter
function getOpenRouterModels(): {
  targetModel: string;
  fallbackModels: string[];
} {
  // Default models list as specified in README
  const DEFAULT_MODELS = [
    'deepseek/deepseek-chat-v3-0324',
    'mistralai/mistral-7b-instruct',
    'google/gemma-7b-it',
    'openchat/openchat-3.5',
    'nousresearch/nous-hermes-2-yi-34b'
  ];

  // Get models from environment variables
  const envModels = process.env.OPENROUTER_FREE_MODELS 
    ? process.env.OPENROUTER_FREE_MODELS.split(',').map(m => m.trim())
    : DEFAULT_MODELS;

  // Get target model (either specified or first in the list)
  const targetModel = process.env.OPENROUTER_TARGET_MODEL || envModels[0];

  // Create fallback list (all models except the target model)
  const fallbackModels = envModels.filter(model => model !== targetModel);

  return {
    targetModel,
    fallbackModels
  };
}

// Determine which API provider to use
function getApiProvider(clientProvider?: string): 'openrouter' | 'requesty' | null {
  // If client specified a provider and we have that API key, use it
  if (clientProvider === 'requesty' && process.env.REQUESTY_API_KEY) {
    return 'requesty';
  }
  
  if (clientProvider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
    return 'openrouter';
  }
  
  // Otherwise, fall back to environment-based selection
  if (process.env.REQUESTY_API_KEY) {
    return 'requesty';
  }
  
  if (process.env.OPENROUTER_API_KEY) {
    return 'openrouter';
  }
  
  // If neither is available, return null
  return null;
}

// Zod Schema for request validation
const XmlDetectionRequestSchema = z.object({
  xmlSample: z.string().min(1, { message: 'XML sample cannot be empty.' }),
  provider: z.enum(['openrouter', 'requesty']).optional(), // Allow client to specify provider
});

// Zod Schema for the expected AI response structure
const AiResponseSchema = z.object({
  itemRootPath: z.string().optional(),
  mappings: z.array(
    z.object({
      fieldName: z.string().min(1, { message: "Field name cannot be empty." }),
      xpath: z.string().min(1, { message: "XPath cannot be empty." }),
    })
  )
});

// System prompt for the AI model
const SYSTEM_PROMPT = `You are an expert XML and XPath analyst. Your task is to analyze a given XML sample, which represents a single product or item, and identify the most relevant XPaths for extracting key pieces of information. Your XPaths MUST be derived *only* from the elements and attributes present in the provided XML sample. Do not infer or add XPaths for fields not explicitly present.

The user will provide an XML snippet. You should return a JSON array of objects, where each object contains:
1. 'fieldName': A clear, human-readable name for the field (e.g., "Product Title", "Price", "SKU")
2. 'xpath': The precise XPath expression to extract this field from the XML

Only use standard XPath 1.0 syntax that would work in XSLT processors. Avoid XPath 2.0/3.0 specific features.

Special Handling for Dynamic Attributes/Key-Value Pairs:
Sometimes, field names are not direct XML element names but are contained within the text of an element, often paired with a corresponding value element. This is common for product attributes or specifications.
For example, you might see a structure like:
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
In such cases, if you identify a repeating parent element (e.g., 'attribute' in the example) that consistently contains:
  a) one sub-element holding the field's conceptual name (e.g., 'name'), and
  b) another sub-element holding that field's value (e.g., 'value', 'label'),
you MUST:
1. Use the text content of the 'name' sub-element (e.g., "Color", "Size") as the 'fieldName' in your JSON output.
2. Construct an XPath that specifically selects the 'value' or 'label' sub-element based on the text content of its sibling 'name' sub-element.
   For the "Color" example above, assuming 'itemRootPath' is '/product', a suitable XPath would be: "attributes/attribute[name='Color']/value/text()".
   For the "Size" example: "attributes/attribute[name='Size']/label/text()".
Adapt the specific tag names (like 'attributes', 'attribute', 'name', 'value', 'label') to match exactly what you find in the provided XML sample.
Do NOT generate XPaths for the container attributes like 'id' or 'attributeId' on the repeating parent element (e.g., <attribute id="...">) unless they represent actual data fields themselves. Focus on the conceptual name-value pairs.

Example response format:
[
  {"fieldName": "Product Title", "xpath": "/product/title/text()"},
  {"fieldName": "Price", "xpath": "/product/price/text()"},
  {"fieldName": "SKU", "xpath": "/product/@sku"}
]

Focus on finding:
- Main product identifiers (ID, SKU, etc.)
- Product name/title
- Description
- Price information
- Image URLs
- Specifications/attributes
- Category information
- Any other fields that appear to be significant based on the XML structure

If the XML contains arrays or repeating elements, provide appropriate XPath queries that target all instances (e.g., "/product/images/image/text()" or "/product/categories/category/@name").

Use relative XPath expressions when appropriate, especially for nested structures.`;

export async function POST(request: NextRequest) {
  try {
    const { xmlSample, provider } = await request.json();
    
    // Validate the request
    const validatedData = XmlDetectionRequestSchema.safeParse({ xmlSample, provider });
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.flatten() },
        { status: 400 }
      );
    }
    
    // Determine which API provider to use (client selection takes precedence)
    const apiProvider = getApiProvider(provider);
    
    // Check if the requested provider is available (has API key)
    if (provider && apiProvider !== provider) {
      return NextResponse.json(
        { error: `The requested provider '${provider}' is not available. API key may be missing.` },
        { status: 400 }
      );
    }
    
    if (!apiProvider) {
      return NextResponse.json(
        { error: 'No API provider configured. Please set up either OPENROUTER_API_KEY or REQUESTY_API_KEY in your environment.' },
        { status: 500 }
      );
    }
    
    // Prepare the system and user prompts
    const systemPrompt = SYSTEM_PROMPT;
    const userPrompt = `Analyze this XML sample and provide XPath expressions for the important fields:\n\n${xmlSample}`;
    
    // Use the appropriate API provider
    if (apiProvider === 'openrouter') {
      return await handleOpenRouterDetection(systemPrompt, userPrompt);
    } else {
      return await handleRequestyDetection(systemPrompt, userPrompt);
    }
    
  } catch (error: any) {
    console.error('Error in AI-based XML detection:', error);
    return NextResponse.json(
      { error: 'Failed to detect XML structure using AI', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Handle XML structure detection using OpenRouter with fallback mechanism
 */
async function handleOpenRouterDetection(systemPrompt: string, userPrompt: string): Promise<NextResponse> {
  // Get the OpenRouter API key
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    return NextResponse.json(
      { error: 'OpenRouter API key is not configured' },
      { status: 500 }
    );
  }
  
  // Get the models to try
  const { targetModel, fallbackModels } = getOpenRouterModels();
  
  // Array of all models to try, starting with the target model
  const modelsToTry = [targetModel, ...fallbackModels];
  
  // Try each model in sequence until successful
  let lastError = null;
  
  for (const model of modelsToTry) {
    try {
      console.log(`Trying OpenRouter model: ${model}`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': 'https://ezconvert.app', // Replace with your actual domain
          'X-Title': 'EzConvert XML Structure Detection'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1, // Low temperature for more deterministic results
          max_tokens: 4000
        })
      });
      
      // If rate limited (429) and there are more models to try, continue to the next model
      if (response.status === 429 && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
        console.log(`Model ${model} rate limited, trying next model`);
        const errorData = await response.json();
        lastError = `${model} rate limited: ${JSON.stringify(errorData)}`;
        continue;
      }
      
      // For other errors, throw an exception
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error with model ${model}: ${JSON.stringify(errorData)}`);
      }
      
      // If we got here, the request was successful
      const data = await response.json();
      
      // Extract the content from the AI response
      const aiContent = data.choices[0]?.message?.content;
      if (!aiContent) {
        throw new Error(`No content in AI response from model ${model}`);
      }
      
      console.log(`Raw AI content from model ${model}:`, aiContent);
      const jsonContent = extractJsonFromString(aiContent);
      console.log(`Content after extractJsonFromString for model ${model}:`, jsonContent);
      let xpathsContent;

      try {
        let parsedJson = JSON.parse(jsonContent);
        console.log('Parsed AI JSON from OpenRouter:', parsedJson); // Log before normalization

        // Normalize the response
        xpathsContent = normalizeAiResponse(parsedJson);
        console.log('Normalized AI JSON from OpenRouter:', xpathsContent); // Log after normalization

      } catch (error) {
        console.error(`Failed to parse JSON from AI response (model ${model}):`, jsonContent);
        throw new Error(`Invalid JSON in AI response from model ${model}`);
      }
      
      // Validate the response format
      const validatedResponse = AiResponseSchema.safeParse(xpathsContent);
      if (!validatedResponse.success) {
        console.error(`Response validation failed for model ${model}:`, validatedResponse.error.flatten());
        throw new Error(`AI response format from model ${model} is invalid`);
      }
      
      // Success! Return the validated XPaths
      return NextResponse.json({
        data: validatedResponse.data, // validatedResponse.data is { itemRootPath, mappings }
        model: `openrouter:${model}`,
        provider: 'openrouter'
      });
      
    } catch (error: any) {
      // Store the error to return if all models fail
      lastError = error.message;
      console.error(`Error with OpenRouter model ${model}:`, error);
      
      // Continue to the next model if there is one
      continue;
    }
  }
  
  // If we get here, all models failed
  return NextResponse.json(
    { 
      error: 'All available OpenRouter models failed to detect XML structure', 
      details: lastError || 'Unknown error',
      provider: 'openrouter'
    },
    { status: 500 }
  );
}

/**
 * Handle XML structure detection using Requesty.ai
 * Requesty.ai handles the fallback chain through their web configuration
 */
async function handleRequestyDetection(systemPrompt: string, userPrompt: string): Promise<NextResponse> {
  // Get the Requesty API key
  const requestyApiKey = process.env.REQUESTY_API_KEY;
  const requestyDefaultModel = process.env.REQUESTY_DEFAULT_MODEL; // Get the default model

  if (!requestyApiKey) {
    return NextResponse.json(
      { error: 'Requesty API key is not configured' },
      { status: 500 }
    );
  }

  if (!requestyDefaultModel) { // Check if the default model is configured
    return NextResponse.json(
      { error: 'Requesty default model is not configured' },
      { status: 500 }
    );
  }
  
  try {
    console.log('Using Requesty.ai for XML detection with model:', requestyDefaultModel);
    
    const response = await fetch('https://router.requesty.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${requestyApiKey}`,
        'X-Title': 'EzConvert XML Structure Detection'
      },
      body: JSON.stringify({
        model: requestyDefaultModel, // Add the model to the request body
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorDetailsText;
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorDetailsText = JSON.stringify(errorData);
      } else {
        errorDetailsText = await response.text(); // Get HTML/text error
        console.error(
          'Requesty API returned non-JSON error response:', 
          errorDetailsText
        );
      }
      throw new Error(`Requesty API error (status ${response.status}): ${errorDetailsText}`);
    }
    
    // If response.ok is true, still check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error(
            `Requesty API response was not JSON (Content-Type: ${contentType}). Response text:`,
            responseText
        );
        throw new Error(
            `Requesty API did not return JSON. Received (first 100 chars): ${responseText.substring(0,100)}...`
        );
    }

    const data = await response.json(); // Now safer to call .json()
    
    // Extract the content from the AI response
    const aiContent = data.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content in Requesty AI response');
    }
    
    // Extract JSON from the AI response
    const jsonContent = extractJsonFromString(aiContent);
    let xpathsContent;
    
    try {
      let parsedJson = JSON.parse(jsonContent);
      console.log('Parsed AI JSON from Requesty:', parsedJson); // Log before normalization

      // Normalize the response
      xpathsContent = normalizeAiResponse(parsedJson);
      console.log('Normalized AI JSON from Requesty:', xpathsContent); // Log after normalization

    } catch (error) {
      console.error('Failed to parse JSON from Requesty AI response:', jsonContent);
      throw new Error('Invalid JSON in Requesty AI response');
    }
    
    // Validate the response format
    const validatedResponse = AiResponseSchema.safeParse(xpathsContent);
    if (!validatedResponse.success) {
      console.error('Response validation failed for Requesty:', validatedResponse.error.flatten());
      throw new Error('Requesty AI response format is invalid');
    }
    
    // Success! Return the validated XPaths
    return NextResponse.json({
      data: validatedResponse.data, // validatedResponse.data is { itemRootPath, mappings }
      model: 'requesty-default',
      provider: 'requesty'
    });
    
  } catch (error: any) {
    console.error('Error with Requesty AI detection:', error);
    return NextResponse.json(
      { 
        error: 'Requesty AI failed to detect XML structure', 
        details: error.message,
        provider: 'requesty'
      },
      { status: 500 }
    );
  }
}
