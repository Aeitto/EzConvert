
import type { XmlProfileFieldMapping, ProcessedRow } from '@/types/ezconvert'; 

export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        // To create a proper data URI for XML text content:
        const textContent = reader.result as string;
        const base64EncodedXml = btoa(unescape(encodeURIComponent(textContent))); // Handles UTF-8
        resolve(`data:application/xml;base64,${base64EncodedXml}`);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file); 
  });
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

export function parseCsv(csvText: string, delimiter: string = ','): Record<string, string>[] {
  const lines = csvText.trim().split(/\r\n|\n|\r/).map(line => line.trim()); // More robust line splitting
  if (lines.length === 0) return [];

  const headers = lines[0].split(delimiter).map(header => header.trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    // Basic CSV value splitting, may need enhancement for values containing delimiters/quotes
    const values = lines[i].split(delimiter).map(value => value.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  return data;
}


function evaluateXPathToElements(contextNode: Node, path: string, xmlDoc: XMLDocument): Element[] {
    const result = xmlDoc.evaluate(path, contextNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const elements: Element[] = [];
    let node = result.iterateNext();
    while (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            elements.push(node as Element);
        }
        node = result.iterateNext();
    }
    return elements;
}

export function parseXml(xmlText: string, itemRootPath: string, fieldMappings: XmlProfileFieldMapping[]): ProcessedRow[] {
  if (!xmlText || !itemRootPath || fieldMappings.length === 0) {
    console.warn("parseXml called with invalid arguments", { xmlText: !!xmlText, itemRootPath, fieldMappingsLength: fieldMappings.length });
    return [];
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    console.error("XML Parsing Error:", parserError.textContent);
    throw new Error(`Failed to parse XML. Details: ${parserError.textContent}`);
  }

  const items: ProcessedRow[] = [];
  let itemNodesArray: Element[] = [];

  try {
    console.log(`Evaluating item root path: ${itemRootPath}`);
    const result = xmlDoc.evaluate(itemRootPath, xmlDoc.documentElement, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let node = result.iterateNext();
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        itemNodesArray.push(node as Element);
      }
      node = result.iterateNext();
    }

    if (itemNodesArray.length === 0) {
      console.log(`XML parsing: No item nodes found for itemRootPath '${itemRootPath}'. Check your XML structure and path.`);
      
      // Fallback: try a simpler approach if the XPath is too complex
      const tagName = itemRootPath.replace(/^\/*/, '').split('/')[0];
      if (tagName) {
        const elements = xmlDoc.getElementsByTagName(tagName);
        console.log(`Fallback: Found ${elements.length} elements with tag name '${tagName}'`);
        for (let i = 0; i < elements.length; i++) {
          itemNodesArray.push(elements[i]);
        }
      }
    }

    console.log(`Found ${itemNodesArray.length} item nodes`);

    itemNodesArray.forEach((itemNode, itemIndex) => {
      const row: ProcessedRow = {};
      
      fieldMappings.forEach(mapping => {
        try {
          if (mapping.isDynamicAttributeMapping) {
            // Handle dynamic attribute mapping
            processDynamicAttributeMapping(itemNode, mapping, row, xmlDoc);
          } else {
            // Handle regular field mapping
            processFieldMapping(itemNode, mapping, row, xmlDoc);
          }
        } catch (e: any) {
          console.error(`Error processing mapping for sourcePath "${mapping.sourcePath}" and header "${mapping.header}":`, e.message);
          if (!mapping.isDynamicAttributeMapping) {
            row[mapping.header] = ''; // Ensure header exists even if mapping fails
          }
        }
      });
      
      items.push(row);
    });
  } catch (e: any) {
    console.error("Error processing XML structure with itemRootPath and mappings:", e);
    throw new Error(`Error during XML node processing: ${e.message}`);
  }

  if (items.length === 0 && itemNodesArray.length > 0) {
    console.log("XML parsing found item nodes, but no data was extracted into rows. Check fieldMappings sourcePaths relative to item nodes.", {itemRootPath, fieldMappingsCount: fieldMappings.length});
  }
  
  return items;
}

/**
 * Process a dynamic attribute mapping where the mapping points to elements containing name/value pairs
 */
function processDynamicAttributeMapping(itemNode: Element, mapping: XmlProfileFieldMapping, row: ProcessedRow, xmlDoc: XMLDocument): void {
  // mapping.sourcePath (e.g., 'attributes/*') points to the elements containing name and value
  const attributeHolderNodes = evaluateXPathToElements(itemNode, mapping.sourcePath, xmlDoc);
  
  attributeHolderNodes.forEach(attrNode => {
    // For dynamic attribute mapping, we need to extract name and value from each node
    const nameNode = attrNode.querySelector('name');
    const valueNode = attrNode.querySelector('value') || attrNode.querySelector('label');
    
    if (nameNode && valueNode) {
      const attrName = extractTextContent(nameNode);
      const attrValue = extractTextContent(valueNode);
      
      if (attrName) {
        // Use the attribute name as the header
        row[attrName] = attrValue || '';
      }
    }
  });
}

/**
 * Process a regular field mapping where the mapping points to a specific element or attribute
 */
function processFieldMapping(itemNode: Element, mapping: XmlProfileFieldMapping, row: ProcessedRow, xmlDoc: XMLDocument): void {
  const sourcePath = mapping.sourcePath;
  console.log(`Processing field mapping: ${mapping.header} with path ${sourcePath}`);
  
  // Handle text() function in XPath
  if (sourcePath.endsWith('/text()')) {
    // Extract the path without the text() function
    const elementPath = sourcePath.substring(0, sourcePath.length - 7);
    const result = evaluateXPath(itemNode, elementPath, xmlDoc, XPathResult.FIRST_ORDERED_NODE_TYPE);
    
    if (result && result.singleNodeValue) {
      const node = result.singleNodeValue as Element;
      row[mapping.header] = extractTextContent(node);
      return;
    }
  }
  
  // Handle attribute selection with predicates like: attribute[name/text()='value']
  if (sourcePath.includes('[') && sourcePath.includes(']') && sourcePath.includes('/text()=')) {
    const pathParts = sourcePath.split('[');
    const basePath = pathParts[0];
    const predicate = pathParts[1].split(']')[0];
    
    // Extract the field name and value from the predicate
    const predicateParts = predicate.split('/text()=');
    const fieldName = predicateParts[0];
    const fieldValue = predicateParts[1].replace(/^'|'$/g, ''); // Remove quotes
    
    // Find all elements matching the base path
    const elements = evaluateXPathToElements(itemNode, basePath, xmlDoc);
    
    for (const element of elements) {
      // Find the field element within this element
      const fieldElement = element.querySelector(fieldName);
      
      if (fieldElement && extractTextContent(fieldElement) === fieldValue) {
        // This is the element we're looking for
        // Now extract the value based on the rest of the path
        if (sourcePath.endsWith('/label/text()')) {
          const labelElement = element.querySelector('label');
          if (labelElement) {
            row[mapping.header] = extractTextContent(labelElement);
            return;
          }
        } else if (sourcePath.endsWith('/@id')) {
          row[mapping.header] = element.getAttribute('id') || '';
          return;
        } else if (sourcePath.endsWith('/@attributeId')) {
          row[mapping.header] = element.getAttribute('attributeId') || '';
          return;
        }
      }
    }
  }
  
  // Handle simple attribute access
  if (sourcePath.startsWith('@')) {
    const attrName = sourcePath.substring(1);
    row[mapping.header] = itemNode.getAttribute(attrName) || '';
    return;
  }
  
  // Try standard XPath evaluation as a fallback
  try {
    const result = evaluateXPath(itemNode, sourcePath, xmlDoc, XPathResult.ANY_TYPE);
    
    if (result) {
      if (result.resultType === XPathResult.STRING_TYPE) {
        row[mapping.header] = result.stringValue || '';
      } else if (result.resultType === XPathResult.ORDERED_NODE_ITERATOR_TYPE || 
                result.resultType === XPathResult.UNORDERED_NODE_ITERATOR_TYPE) {
        const values: string[] = [];
        let node = result.iterateNext();
        
        while (node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            values.push(extractTextContent(node as Element));
          } else if (node.nodeType === Node.ATTRIBUTE_NODE) {
            values.push((node as Attr).value);
          } else if (node.nodeType === Node.TEXT_NODE) {
            values.push(node.textContent || '');
          }
          node = result.iterateNext();
        }
        
        row[mapping.header] = values.join('\n');
      } else if (result.resultType === XPathResult.FIRST_ORDERED_NODE_TYPE || 
                result.resultType === XPathResult.ANY_UNORDERED_NODE_TYPE) {
        const node = result.singleNodeValue;
        
        if (node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            row[mapping.header] = extractTextContent(node as Element);
          } else if (node.nodeType === Node.ATTRIBUTE_NODE) {
            row[mapping.header] = (node as Attr).value;
          } else if (node.nodeType === Node.TEXT_NODE) {
            row[mapping.header] = node.textContent || '';
          }
        }
      }
    }
  } catch (e) {
    console.error(`Failed to evaluate XPath: ${sourcePath}`, e);
    row[mapping.header] = ''; // Ensure the header exists even if XPath evaluation fails
  }
}

/**
 * Extract text content from an element, handling CDATA sections
 */
function extractTextContent(element: Element): string {
  // Check for CDATA sections
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node.nodeType === Node.CDATA_SECTION_NODE) {
      return node.textContent || '';
    }
  }
  
  // Fallback to regular text content
  return element.textContent || '';
}

/**
 * Evaluate an XPath expression and return the result
 */
function evaluateXPath(contextNode: Node, path: string, xmlDoc: XMLDocument, resultType: number): XPathResult | null {
  try {
    return xmlDoc.evaluate(path, contextNode, null, resultType, null);
  } catch (e) {
    console.error(`Failed to evaluate XPath: ${path}`, e);
    return null;
  }
}

export function convertToCsv(data: Record<string, any>[], headers: readonly string[], delimiter: ',' | ';' = ','): string {
  if (!data || data.length === 0) return "";

  const escapeCsvCell = (cellData: any): string => {
    const stringValue = cellData === null || typeof cellData === 'undefined' ? '' : String(cellData);
    if (stringValue.includes(delimiter) || stringValue.includes('\n') || stringValue.includes('\r') || stringValue.includes('"')) {
      // For newlines within a cell, Excel expects the content to be quoted,
      // and internal quotes to be doubled.
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const headerRow = headers.map(escapeCsvCell).join(delimiter);
  const dataRows = data.map(row => {
    return headers.map(header => escapeCsvCell(row[header])).join(delimiter);
  });

  return [headerRow, ...dataRows].join('\r\n');
}
