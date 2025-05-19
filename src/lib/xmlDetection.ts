/**
 * XML structure detection utility for EzConvert
 * 
 * This module provides functions to analyze XML samples and detect their structure
 * for creating XML profiles with proper XPath mappings.
 */

import { v4 as uuidv4 } from 'uuid';
import type { XmlProfileFieldMapping } from '@/types/ezconvert';

/**
 * Result of XML structure detection
 */
export interface XmlDetectionResult {
  rootPath: string;
  fieldMappings: XmlProfileFieldMapping[];
}

/**
 * Analyzes an XML sample to detect its structure and suggest XPath mappings
 * 
 * @param xmlSample - The XML sample to analyze
 * @returns A promise that resolves to the detection result
 */
export async function detectXmlStructure(xmlSample: string): Promise<XmlDetectionResult> {
  try {
    // Parse the XML to identify structure
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlSample, "text/xml");
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("XML parsing error: " + parserError.textContent);
    }
    
    // Find potential root elements that might represent a product/item
    const rootElement = findPotentialItemRoot(xmlDoc);
    if (!rootElement) {
      throw new Error("Could not identify a clear product/item element in the XML");
    }
    
    // Generate the root path
    const rootPath = generateXPath(rootElement);
    
    // Extract field mappings from the root element
    const fieldMappings = extractFieldMappings(rootElement);
    
    return {
      rootPath,
      fieldMappings
    };
  } catch (error) {
    console.error("XML detection error:", error);
    throw error;
  }
}

/**
 * Finds a potential root element that represents a product/item
 * 
 * @param xmlDoc - The parsed XML document
 * @returns The potential root element or null if not found
 */
function findPotentialItemRoot(xmlDoc: Document): Element | null {
  // Common product/item element names
  const potentialRootNames = [
    'product', 'item', 'entry', 'record', 'article', 'good', 'merchandise',
    'listing', 'offer', 'variant', 'sku'
  ];
  
  // Try to find elements with these names
  for (const name of potentialRootNames) {
    const elements = xmlDoc.getElementsByTagName(name);
    if (elements.length > 0) {
      return elements[0];
    }
  }
  
  // If no common names found, look for elements with many child elements
  // that might represent a product
  const allElements = xmlDoc.getElementsByTagName("*");
  let bestCandidate: Element | null = null;
  let maxChildCount = 0;
  
  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i];
    // Skip the root document element
    if (element === xmlDoc.documentElement) continue;
    
    const childCount = element.children.length;
    if (childCount > maxChildCount) {
      maxChildCount = childCount;
      bestCandidate = element;
    }
  }
  
  // If we found an element with at least 3 children, it might be a product
  if (maxChildCount >= 3) {
    return bestCandidate;
  }
  
  // Fallback to the document element if nothing else found
  return xmlDoc.documentElement;
}

/**
 * Generates an XPath expression for an element
 * 
 * @param element - The element to generate an XPath for
 * @returns The XPath expression
 */
function generateXPath(element: Element): string {
  // For simplicity, we'll use the tag name with // to find it anywhere in the document
  return `//${element.tagName.toLowerCase()}`;
}

/**
 * Extracts field mappings from a root element
 * 
 * @param rootElement - The root element to extract mappings from
 * @returns An array of field mappings
 */
function extractFieldMappings(rootElement: Element): XmlProfileFieldMapping[] {
  const mappings: XmlProfileFieldMapping[] = [];
  const processedPaths = new Set<string>();
  
  // Process direct child elements
  for (let i = 0; i < rootElement.children.length; i++) {
    const child = rootElement.children[i];
    const tagName = child.tagName.toLowerCase();
    
    // Skip if we've already processed this tag
    if (processedPaths.has(tagName)) continue;
    processedPaths.add(tagName);
    
    // Create a mapping for this child
    mappings.push({
      id: uuidv4(),
      sourcePath: tagName,
      header: formatHeaderName(tagName),
      isDynamicAttributeMapping: false
    });
  }
  
  // Check for attributes on the root element
  if (rootElement.attributes.length > 0) {
    // Check if there are multiple attributes that might be dynamic
    if (rootElement.attributes.length >= 3) {
      // Suggest a dynamic attribute mapping
      mappings.push({
        id: uuidv4(),
        sourcePath: '@*', // XPath for all attributes
        header: '', // Empty header for dynamic mapping
        isDynamicAttributeMapping: true
      });
    } else {
      // Map individual attributes
      for (let i = 0; i < rootElement.attributes.length; i++) {
        const attr = rootElement.attributes[i];
        mappings.push({
          id: uuidv4(),
          sourcePath: `@${attr.name}`,
          header: formatHeaderName(attr.name),
          isDynamicAttributeMapping: false
        });
      }
    }
  }
  
  // Look for potential nested structures that might contain attributes
  const potentialAttrContainers = rootElement.querySelectorAll('attributes, attrs, properties, specs, specifications, features');
  if (potentialAttrContainers.length > 0) {
    // For each potential container, suggest a dynamic mapping
    for (let i = 0; i < potentialAttrContainers.length; i++) {
      const container = potentialAttrContainers[i];
      const path = container.tagName.toLowerCase();
      
      // Check if this container has child elements that might be attributes
      if (container.children.length > 0) {
        mappings.push({
          id: uuidv4(),
          sourcePath: `${path}/*`, // All children of this container
          header: '', // Empty header for dynamic mapping
          isDynamicAttributeMapping: true
        });
      }
    }
  }
  
  return mappings;
}

/**
 * Formats a tag or attribute name into a readable header name
 * 
 * @param name - The tag or attribute name
 * @returns A formatted header name
 */
function formatHeaderName(name: string): string {
  // Remove any prefixes or namespaces
  let cleanName = name.includes(':') ? name.split(':')[1] : name;
  
  // Convert camelCase or snake_case to Title Case with spaces
  cleanName = cleanName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/-/g, ' ') // Replace hyphens with spaces
    .trim();
  
  // Capitalize first letter of each word
  return cleanName.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
