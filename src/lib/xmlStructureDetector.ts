/**
 * Custom XML Structure Detector for EzConvert
 * 
 * This module provides a reliable alternative to AI-based XML structure detection
 * by using a server-compatible XML parser to generate accurate XPath expressions.
 */

import { v4 as uuidv4 } from 'uuid';
import type { XmlProfileFieldMapping } from '@/types/ezconvert';
import { XMLParser } from 'fast-xml-parser';

// Define interfaces for parsed XML structure
interface XmlAttribute {
  [key: string]: string;
}

interface XmlCategory {
  '@_id'?: string;
  '#text'?: string;
  [key: string]: any;
}

interface XmlAttributeItem {
  '@_id'?: string;
  '@_attributeId'?: string;
  name?: string;
  label?: string;
  [key: string]: any;
}

interface XmlProduct {
  [key: string]: any;
  categories?: {
    category: XmlCategory | XmlCategory[];
  };
  attributes?: {
    attribute: XmlAttributeItem | XmlAttributeItem[];
  };
}

export interface XmlDetectionResult {
  rootPath: string;
  fieldMappings: XmlProfileFieldMapping[];
}

/**
 * Detects the structure of an XML document and generates accurate XPath expressions
 * 
 * @param xmlSample - The XML sample to analyze
 * @returns The detection result
 */
export function detectXmlStructure(xmlSample: string): XmlDetectionResult {
  try {
    // Create parser options to handle attributes and preserve case
    const options = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      parseAttributeValue: false,
      trimValues: true
    };
    
    // Parse the XML
    const parser = new XMLParser(options);
    const result = parser.parse(xmlSample);
    
    if (!result) {
      throw new Error('Failed to parse XML');
    }
    
    // Get the root element name and content
    const rootElementName = Object.keys(result)[0];
    const rootElement = result[rootElementName] as Record<string, any>;
    
    if (!rootElement) {
      throw new Error('No root element found in XML');
    }
    
    const rootPath = `/${rootElementName}`;
    const fieldMappings: XmlProfileFieldMapping[] = [];
    
    // Find the item element - this is the element we'll extract fields from
    // It could be directly under the root or nested deeper
    const { itemElementName, itemElement, itemPath } = findItemElement(rootElement, rootPath);
    
    if (!itemElement) {
      throw new Error('Could not identify a clear item/product element in the XML');
    }
    
    console.log(`Found item element: ${itemElementName} at path: ${itemPath}`);
    
    // Process the item element to extract all possible XPaths
    processElement(itemElement, itemPath, fieldMappings);
    
    return {
      rootPath: itemPath,
      fieldMappings
    };
  } catch (error) {
    console.error("XML detection error:", error);
    throw error;
  }
}

/**
 * Find the item/product element in the XML
 * This is the element that contains the data we want to extract
 */
function findItemElement(rootElement: Record<string, any>, rootPath: string): { 
  itemElementName: string; 
  itemElement: Record<string, any>; 
  itemPath: string 
} {
  // Common names for item/product elements
  const itemNames = ['product', 'item', 'entry', 'record', 'article', 'offer'];
  
  // First try: look for common item names as direct children of root
  for (const name of itemNames) {
    if (rootElement[name]) {
      // If it's an array, take the first item as our template
      if (Array.isArray(rootElement[name])) {
        return {
          itemElementName: name,
          itemElement: rootElement[name][0],
          itemPath: `${rootPath}/${name}`
        };
      } else {
        return {
          itemElementName: name,
          itemElement: rootElement[name],
          itemPath: `${rootPath}/${name}`
        };
      }
    }
  }
  
  // Second try: find the element with the most child elements or attributes
  // This is likely to be our item element
  let bestCandidate = { name: '', element: null as any, childCount: 0 };
  
  for (const key of Object.keys(rootElement)) {
    // Skip attributes
    if (key.startsWith('@_')) continue;
    
    const element = rootElement[key];
    
    // If it's an array, check the first element
    if (Array.isArray(element) && element.length > 0) {
      const childCount = countProperties(element[0]);
      if (childCount > bestCandidate.childCount) {
        bestCandidate = { name: key, element: element[0], childCount };
      }
    } 
    // If it's an object, count its properties
    else if (typeof element === 'object' && element !== null) {
      const childCount = countProperties(element);
      if (childCount > bestCandidate.childCount) {
        bestCandidate = { name: key, element, childCount };
      }
    }
  }
  
  if (bestCandidate.element) {
    return {
      itemElementName: bestCandidate.name,
      itemElement: bestCandidate.element,
      itemPath: `${rootPath}/${bestCandidate.name}`
    };
  }
  
  // Last resort: use the root element itself
  return {
    itemElementName: rootPath.substring(1), // Remove leading slash
    itemElement: rootElement,
    itemPath: rootPath
  };
}

/**
 * Count the number of properties in an object (excluding attributes)
 */
function countProperties(obj: Record<string, any>): number {
  if (!obj || typeof obj !== 'object') return 0;
  
  return Object.keys(obj).filter(key => !key.startsWith('@_')).length;
}

/**
 * Process an element to extract XPath mappings
 */
function processElement(
  element: Record<string, any>,
  elementPath: string,
  fieldMappings: XmlProfileFieldMapping[],
  depth: number = 0,
  processedPaths: Set<string> = new Set()
): void {
  // Don't go too deep in the structure
  if (depth > 3) return;
  
  // Process attributes
  Object.keys(element).forEach(key => {
    if (key.startsWith('@_')) {
      const attrName = key.substring(2); // Remove the '@_' prefix
      const attrPath = `${elementPath}/@${attrName}`;
      
      // Skip if already processed
      if (processedPaths.has(attrPath)) return;
      processedPaths.add(attrPath);
      
      fieldMappings.push({
        id: uuidv4(),
        sourcePath: attrPath,
        header: formatFieldName(attrName),
        isDynamicAttributeMapping: false
      });
    }
  });
  
  // Process child elements
  Object.keys(element).forEach(key => {
    // Skip attributes
    if (key.startsWith('@_')) return;
    
    const childElement = element[key];
    const childPath = `${elementPath}/${key}`;
    
    // Handle arrays
    if (Array.isArray(childElement)) {
      // For arrays, we'll create a mapping for the first item
      if (childElement.length > 0) {
        const firstItem = childElement[0];
        
        // If it's a simple value or has a text value
        if (typeof firstItem !== 'object' || firstItem['#text']) {
          const textPath = `${childPath}/text()`;
          
          // Skip if already processed
          if (processedPaths.has(textPath)) return;
          processedPaths.add(textPath);
          
          fieldMappings.push({
            id: uuidv4(),
            sourcePath: textPath,
            header: formatFieldName(key),
            isDynamicAttributeMapping: false
          });
        } 
        // If it's a complex object, process it recursively
        else if (typeof firstItem === 'object') {
          processElement(firstItem, childPath, fieldMappings, depth + 1, processedPaths);
        }
      }
    }
    // Handle objects
    else if (typeof childElement === 'object' && childElement !== null) {
      // Check if it has a text value
      if (childElement['#text']) {
        const textPath = `${childPath}/text()`;
        
        // Skip if already processed
        if (processedPaths.has(textPath)) return;
        processedPaths.add(textPath);
        
        fieldMappings.push({
          id: uuidv4(),
          sourcePath: textPath,
          header: formatFieldName(key),
          isDynamicAttributeMapping: false
        });
      }
      
      // Special handling for name/value or name/label patterns
      if (childElement.name && (childElement.value || childElement.label)) {
        const nameValue = childElement.name;
        const valuePath = childElement.value 
          ? `${elementPath}/${key}[name/text()='${nameValue}']/value/text()` 
          : `${elementPath}/${key}[name/text()='${nameValue}']/label/text()`;
        
        // Skip if already processed
        if (processedPaths.has(valuePath)) return;
        processedPaths.add(valuePath);
        
        fieldMappings.push({
          id: uuidv4(),
          sourcePath: valuePath,
          header: `${formatFieldName(key)}${formatAttributeName(nameValue)}`,
          isDynamicAttributeMapping: false
        });
      } else {
        // Process the child element recursively
        processElement(childElement, childPath, fieldMappings, depth + 1, processedPaths);
      }
    }
    // Handle simple values
    else if (childElement !== undefined && childElement !== null) {
      const textPath = `${childPath}/text()`;
      
      // Skip if already processed
      if (processedPaths.has(textPath)) return;
      processedPaths.add(textPath);
      
      fieldMappings.push({
        id: uuidv4(),
        sourcePath: textPath,
        header: formatFieldName(key),
        isDynamicAttributeMapping: false
      });
    }
  });
  
  // Special handling for attribute elements with name/value pairs
  // This is common in many XML formats
  handleAttributeElements(element, elementPath, fieldMappings, processedPaths);
}

/**
 * Handle attribute elements with name/value pairs
 */
function handleAttributeElements(
  element: Record<string, any>,
  elementPath: string,
  fieldMappings: XmlProfileFieldMapping[],
  processedPaths: Set<string>
): void {
  // Check for common patterns like <attributes><attribute><name>Color</name><value>Red</value></attribute></attributes>
  const attributesKey = Object.keys(element).find(key => 
    key === 'attributes' || key === 'attrs' || key === 'attribute'
  );
  
  if (!attributesKey) return;
  
  const attributes = element[attributesKey];
  
  // Handle direct attribute objects
  if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
    if (attributes.name && (attributes.value || attributes.label)) {
      const nameValue = attributes.name;
      const valuePath = attributes.value 
        ? `${elementPath}/${attributesKey}/value/text()` 
        : `${elementPath}/${attributesKey}/label/text()`;
      
      if (!processedPaths.has(valuePath)) {
        processedPaths.add(valuePath);
        fieldMappings.push({
          id: uuidv4(),
          sourcePath: valuePath,
          header: `Attribute${formatAttributeName(nameValue)}`,
          isDynamicAttributeMapping: false
        });
      }
    }
  }
  
  // Handle attribute arrays
  if (attributes && attributes.attribute) {
    const attributeItems = Array.isArray(attributes.attribute) 
      ? attributes.attribute 
      : [attributes.attribute];
    
    attributeItems.forEach((attr: Record<string, any>) => {
      if (attr.name && (attr.value || attr.label)) {
        const nameValue = attr.name;
        const formattedName = formatAttributeName(nameValue);
        const attributePath = `${elementPath}/${attributesKey}/attribute`;
        const valuePath = attr.value 
          ? `${attributePath}[name/text()='${nameValue}']/value/text()` 
          : `${attributePath}[name/text()='${nameValue}']/label/text()`;
        
        if (!processedPaths.has(valuePath)) {
          processedPaths.add(valuePath);
          fieldMappings.push({
            id: uuidv4(),
            sourcePath: valuePath,
            header: `Attribute${formattedName}`,
            isDynamicAttributeMapping: false
          });
        }
        
        // Add mappings for attribute's id and attributeId if they exist
        if (attr['@_id']) {
          const idPath = `${attributePath}[name/text()='${nameValue}']/@id`;
          if (!processedPaths.has(idPath)) {
            processedPaths.add(idPath);
            fieldMappings.push({
              id: uuidv4(),
              sourcePath: idPath,
              header: `Attribute${formattedName}Id`,
              isDynamicAttributeMapping: false
            });
          }
        }
        
        if (attr['@_attributeId']) {
          const attrIdPath = `${attributePath}[name/text()='${nameValue}']/@attributeId`;
          if (!processedPaths.has(attrIdPath)) {
            processedPaths.add(attrIdPath);
            fieldMappings.push({
              id: uuidv4(),
              sourcePath: attrIdPath,
              header: `Attribute${formattedName}AttributeId`,
              isDynamicAttributeMapping: false
            });
          }
        }
      }
    });
  }
    
  } catch (error) {
    console.error("XML detection error:", error);
    throw error;
  }
}

/**
 * Formats a field name to be more readable
 * 
 * @param name - The raw field name
 * @returns A formatted field name
 */
function formatFieldName(name: string): string {
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
    .join('');
}

/**
 * Formats an attribute name to be used in a field name
 * 
 * @param name - The attribute name
 * @returns A formatted attribute name
 */
function formatAttributeName(name: string): string {
  // Remove any prefixes or namespaces
  let cleanName = name.includes(':') ? name.split(':')[1] : name;
  
  // Convert to PascalCase
  cleanName = cleanName
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  return cleanName;
}
