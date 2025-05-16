
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
    // Use document.evaluate for more complex/standard XPath for itemRootPath
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
    }

    itemNodesArray.forEach((itemNode) => {
      const row: ProcessedRow = {};
      fieldMappings.forEach(mapping => {
        try {
            if (mapping.isDynamicAttributeMapping) {
                // mapping.sourcePath (e.g., 'attrs/a') points to the elements containing name and value.
                const attributeHolderNodes = evaluateXPathToElements(itemNode, mapping.sourcePath, xmlDoc);
                attributeHolderNodes.forEach(holderNode => {
                    const attrKey = holderNode.getAttribute('name');
                    const attrValueNode = holderNode.firstChild; // Assuming CDATA or text is the first child
                    let attrValue = '';
                    if (attrValueNode && (attrValueNode.nodeType === Node.TEXT_NODE || attrValueNode.nodeType === Node.CDATA_SECTION_NODE)) {
                         attrValue = attrValueNode.textContent || '';
                    } else if (holderNode.textContent){ // Fallback to textContent if no direct CDATA/text child
                        attrValue = holderNode.textContent;
                    }

                    if (attrKey) { // Only add if key is present
                        const finalHeader = mapping.header ? `${mapping.header}${attrKey}` : attrKey;
                        row[finalHeader] = attrValue.trim();
                    }
                });

            } else { // Regular mapping
                let value: string | null = null;
                const pathSegments = mapping.sourcePath.split('/');
                let currentContextNode: Node | Element = itemNode;
                let resolvedNodes: Element[] = [];

                if (mapping.sourcePath.startsWith('@')) { // Attribute on the itemNode itself
                    value = (itemNode as Element).getAttribute(mapping.sourcePath.substring(1));
                } else if (!mapping.sourcePath.includes('/') && mapping.sourcePath.includes('@')) { // like "tag@attr" on itemNode
                    const [tagName, attrName] = mapping.sourcePath.split('@');
                     const directChildren = Array.from((itemNode as Element).children).filter(child => child.tagName.toLowerCase() === tagName.toLowerCase());
                     if (directChildren.length > 0) {
                        value = directChildren[0].getAttribute(attrName);
                     }
                }
                else {
                    resolvedNodes = evaluateXPathToElements(itemNode, mapping.sourcePath, xmlDoc);
                    if (resolvedNodes.length > 0) {
                        // Check if the last part of the sourcePath is an attribute
                        const lastSegment = pathSegments[pathSegments.length - 1];
                        if (lastSegment.startsWith('@')) {
                            const attrName = lastSegment.substring(1);
                            // If mapping.sourcePath was "parent/child@attr", resolvedNodes would be the <child> elements
                            value = resolvedNodes.map(n => n.getAttribute(attrName)).filter(v => v !== null).join('\n');
                        } else {
                             value = resolvedNodes.map(n => {
                                // Prefer CDATA if present
                                if (n.childNodes.length === 1 && n.childNodes[0].nodeType === Node.CDATA_SECTION_NODE) {
                                    return n.childNodes[0].textContent;
                                }
                                return n.textContent;
                            }).join('\n');
                        }
                    }
                }
                row[mapping.header] = value !== null ? value.trim() : '';
            }
        } catch (e:any) {
             console.error(`Error processing mapping for sourcePath "${mapping.sourcePath}" and header "${mapping.header}":`, e.message);
             if(!mapping.isDynamicAttributeMapping) {
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
