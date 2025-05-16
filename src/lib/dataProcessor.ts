
import type { RawDataItem, ProcessedRow, XmlProfile, CsvProfile, FileType, XmlProfileFieldMapping } from '@/types/ezconvert';
import { parseCsv, parseXml } from './fileUtils';

// This function is less relevant now as parseXml directly maps to headers from profile.
// For CSV, it maps based on csvProfile.headerMappings.
export function mapDataToProcessedRows(
  rawData: RawDataItem[],
  fileType: FileType,
  profile: XmlProfile | CsvProfile
): ProcessedRow[] {
  if (!rawData) return [];

  if (fileType === 'csv') {
    const csvProfile = profile as CsvProfile;
    return rawData.map((rawItem): ProcessedRow => {
      const processedRow: ProcessedRow = {};
      // Use headerMappings from CSV profile to transform rawItem keys to desired output keys
      for (const rawHeader in rawItem) {
        if (Object.prototype.hasOwnProperty.call(rawItem, rawHeader)) {
          const outputHeader = csvProfile.headerMappings[rawHeader] || rawHeader; // Use mapping or original if no mapping
          processedRow[outputHeader] = rawItem[rawHeader];
        }
      }
      // Ensure all explicitly defined headers in mappings (even if not in raw data) are present
      Object.values(csvProfile.headerMappings).forEach(mappedHeader => {
        if (!Object.prototype.hasOwnProperty.call(processedRow, mappedHeader)){
            // This case is tricky - if a mapped header isn't from a rawHeader, what's its source?
            // For now, we assume mappings are from existing rawHeaders.
            // If we need to create columns not from source, that's a different feature.
        }
      });
      return processedRow;
    });
  } else if (fileType === 'xml') {
    // For XML, parseXml is expected to have already used the profile's fieldMappings
    // to structure each rawItem with keys corresponding to `mapping.header`.
    // So, rawData items are already effectively ProcessedRows.
    return rawData as ProcessedRow[];
  }
  return [];
}


export async function processUploadedFile(
  file: File,
  fileType: FileType,
  profile: XmlProfile | CsvProfile,
  fileContent: string
): Promise<{ rawData: RawDataItem[], processedData: ProcessedRow[] }> {
  let rawDataForContext: RawDataItem[] = []; // This might be the "original" unmapped data
  let processedOutputData: ProcessedRow[] = [];

  if (fileType === 'csv') {
    const csvProfile = profile as CsvProfile;
    const parsedCsv = parseCsv(fileContent, csvProfile.delimiter);
    rawDataForContext = parsedCsv; // Raw CSV rows with original headers

    processedOutputData = parsedCsv.map(rawCsvRow => {
      const row: ProcessedRow = {};
      // Apply headerMappings from CsvProfile
      // If csvProfile.hasHeaderRow is true, keys of rawCsvRow are original headers
      // If false, keys are 'column_1', 'column_2' etc. (or however parseCsv handles it)
      for (const originalHeader in rawCsvRow) {
        if (Object.prototype.hasOwnProperty.call(rawCsvRow, originalHeader)) {
          const targetHeader = csvProfile.headerMappings[originalHeader] || originalHeader; // Use mapping, or original if no mapping
          row[targetHeader] = rawCsvRow[originalHeader];
        }
      }
      return row;
    });

  } else if (fileType === 'xml') {
    const xmlProfile = profile as XmlProfile;
    if (!xmlProfile.itemRootPath || xmlProfile.fieldMappings.length === 0) {
      throw new Error("XML profile is incomplete. Please define item root path and field mappings.");
    }
    // parseXml uses fieldMappings to structure output where keys are `mapping.header`
    const parsedXmlData = parseXml(fileContent, xmlProfile.itemRootPath, xmlProfile.fieldMappings);
    // In this case, parsedXmlData items are already structured as ProcessedRow based on profile
    processedOutputData = parsedXmlData; 
    // rawDataForContext could be the same, or a more "raw" version if parseXml could provide it.
    // For simplicity now, let's assume they are the same for XML after parsing.
    rawDataForContext = parsedXmlData; 
  }
  
  return { rawData: rawDataForContext, processedData: processedOutputData };
}
