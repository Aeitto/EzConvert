
export type FileType = 'csv' | 'xml';

export const STANDARD_COLUMN_HEADERS = [
  "ProductID", 
  "ProductName", 
  "Description", 
  "Price", 
  "SKU", 
  "Category", 
  "Manufacturer",
  "ImageURL", // General image URL, can be used for main or if only one image
  "StockQuantity",
  "Color",
  "Size",
  // Users can now add custom headers beyond this list like "Miniature", "ImageURL1", "ImageURL2", "Akumulator"
] as const;

export type StandardColumnHeaderType = typeof STANDARD_COLUMN_HEADERS[number]; // This type might be less relevant if headers are fully custom

export interface XmlProfileFieldMapping {
  id: string;
  sourcePath: string; 
  header: string; // For regular mappings, this is the header. For dynamic, it's an optional prefix.
  isDynamicAttributeMapping?: boolean; // If true, 'name' attr of sourcePath element becomes header key, textContent is value
}

export interface XmlProfile {
  id: string;
  name: string;
  itemRootPath: string; 
  fieldMappings: XmlProfileFieldMapping[];
  createdAt: string;
}

export interface CsvProfile {
  id: string;
  name: string;
  headerMappings: Record<string, string>; 
  delimiter: ',' | ';' | '\t' | '|';
  hasHeaderRow: boolean;
  createdAt: string;
}

export type Profile = XmlProfile | CsvProfile;

// Allows any string as a key, accommodating dynamically generated headers
export type ProcessedRow = Record<string, string | number | boolean | null>;

export type RawDataItem = Record<string, any>;

