
"use client";
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { FileType, XmlProfile, CsvProfile, ProcessedRow, RawDataItem, XmlProfileFieldMapping } from '@/types/ezconvert'; // Added XmlProfileFieldMapping
import { STANDARD_COLUMN_HEADERS } from '@/types/ezconvert';

interface EzConvertContextType {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  fileType: FileType | null;
  setFileType: (type: FileType | null) => void;
  
  xmlProfiles: XmlProfile[];
  addXmlProfile: (profile: XmlProfile) => void;
  updateXmlProfile: (profile: XmlProfile) => void;
  deleteXmlProfile: (profileId: string) => void;
  selectedXmlProfileId: string | null;
  setSelectedXmlProfileId: (id: string | null) => void;
  
  csvProfile: CsvProfile; 
  setCsvProfile: (profile: CsvProfile) => void;

  rawData: RawDataItem[] | null;
  setRawData: (data: RawDataItem[] | null) => void;
  processedData: ProcessedRow[] | null;
  setProcessedData: (data: ProcessedRow[] | null) => void;
  
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  suggestedColumnHeaders: readonly string[]; 

  isSuggestingValues: boolean;
  setIsSuggestingValues: (suggesting: boolean) => void;
}

const EzConvertContext = createContext<EzConvertContextType | undefined>(undefined);

const initialCsvProfile: CsvProfile = {
  id: 'default-csv',
  name: 'Default CSV Profile',
  headerMappings: {}, 
  delimiter: ',',
  hasHeaderRow: true,
  createdAt: new Date().toISOString(),
};

const LOCAL_STORAGE_KEYS = {
  XML_PROFILES: 'ezConvertXmlProfiles',
  SELECTED_XML_PROFILE_ID: 'ezConvertSelectedXmlProfileId',
  CSV_PROFILE: 'ezConvertCsvProfile',
};

export function EzConvertProvider({ children }: { children: ReactNode }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  
  const [xmlProfiles, setXmlProfiles] = useState<XmlProfile[]>(() => {
    if (typeof window !== 'undefined') {
      const storedProfiles = localStorage.getItem(LOCAL_STORAGE_KEYS.XML_PROFILES);
      try {
        const parsedProfiles = storedProfiles ? JSON.parse(storedProfiles) : [];
        if (!Array.isArray(parsedProfiles)) {
            throw new Error("Stored XML profiles are not an array.");
        }
        return parsedProfiles.map((profile: any): XmlProfile => ({ // Explicit return type
          id: typeof profile.id === 'string' ? profile.id : crypto.randomUUID(),
          name: typeof profile.name === 'string' ? profile.name : 'Unnamed Profile',
          itemRootPath: typeof profile.itemRootPath === 'string' ? profile.itemRootPath : '',
          fieldMappings: Array.isArray(profile.fieldMappings) 
            ? profile.fieldMappings.map((fm: any): XmlProfileFieldMapping => ({ // Explicit return type
                id: typeof fm.id === 'string' ? fm.id : crypto.randomUUID(),
                sourcePath: typeof fm.sourcePath === 'string' ? fm.sourcePath : '',
                header: typeof fm.header === 'string' ? fm.header : 'UnknownHeader',
                isDynamicAttributeMapping: typeof fm.isDynamicAttributeMapping === 'boolean' ? fm.isDynamicAttributeMapping : false,
              }))
            : [],
          createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : new Date().toISOString(),
        }));
      } catch (e) {
        console.error("Failed to parse or validate XML profiles from localStorage:", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.XML_PROFILES);
        return [];
      }
    }
    return [];
  });

  const [selectedXmlProfileId, setSelectedXmlProfileId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_XML_PROFILE_ID) || null;
    }
    return null;
  });
  
  const [csvProfile, setCsvProfile] = useState<CsvProfile>(() => {
    if (typeof window !== 'undefined') {
      const storedProfile = localStorage.getItem(LOCAL_STORAGE_KEYS.CSV_PROFILE);
      try {
        const parsed = storedProfile ? JSON.parse(storedProfile) : initialCsvProfile;
        return {
            ...initialCsvProfile,
            ...parsed,
            id: typeof parsed.id === 'string' ? parsed.id : initialCsvProfile.id,
            name: typeof parsed.name === 'string' ? parsed.name : initialCsvProfile.name,
            delimiter: [',', ';', '\t', '|'].includes(parsed.delimiter) ? parsed.delimiter : initialCsvProfile.delimiter,
            hasHeaderRow: typeof parsed.hasHeaderRow === 'boolean' ? parsed.hasHeaderRow : initialCsvProfile.hasHeaderRow,
            createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : initialCsvProfile.createdAt,
            headerMappings: typeof parsed.headerMappings === 'object' && parsed.headerMappings !== null ? parsed.headerMappings : {},
        };
      } catch (e) {
        console.error("Failed to parse CSV profile from localStorage", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CSV_PROFILE);
        return initialCsvProfile;
      }
    }
    return initialCsvProfile;
  });

  const [rawData, setRawData] = useState<RawDataItem[] | null>(null);
  
  // Sample data for testing purposes
  const sampleData: ProcessedRow[] = [
    {
      ProductID: "1001",
      ProductName: "Smartphone X",
      Description: "Latest smartphone with advanced features",
      Price: "799.99",
      SKU: "SP-X1001",
      Category: "Electronics",
      Manufacturer: "TechCorp"
    },
    {
      ProductID: "1002",
      ProductName: "Bluetooth Headphones",
      Description: "Wireless noise-cancelling headphones",
      Price: "149.99",
      SKU: "BH-2002",
      Category: "Audio",
      Manufacturer: "SoundWave"
    },
    {
      ProductID: "1003",
      ProductName: "Smart Watch",
      Description: "Fitness tracker with heart rate monitor",
      Price: "249.99",
      SKU: "SW-3003",
      Category: "Wearables",
      Manufacturer: "TechCorp"
    },
    {
      ProductID: "1004",
      ProductName: "Laptop Pro",
      Description: "High-performance laptop for professionals",
      Price: "1299.99",
      SKU: "LP-4004",
      Category: "Computers",
      Manufacturer: "ComputeX"
    },
    {
      ProductID: "1005",
      ProductName: "Wireless Mouse",
      Description: "Ergonomic wireless mouse with long battery life",
      Price: "39.99",
      SKU: "WM-5005",
      Category: "Accessories",
      Manufacturer: "PeripheralPlus"
    }
  ];
  
  // Initialize processedData with sample data for testing
  const [processedData, setProcessedData] = useState<ProcessedRow[] | null>(sampleData);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isSuggestingValues, setIsSuggestingValues] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEYS.XML_PROFILES, JSON.stringify(xmlProfiles));
    }
  }, [xmlProfiles]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedXmlProfileId) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_XML_PROFILE_ID, selectedXmlProfileId);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SELECTED_XML_PROFILE_ID);
      }
    }
  }, [selectedXmlProfileId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CSV_PROFILE, JSON.stringify(csvProfile));
    }
  }, [csvProfile]);

  const addXmlProfile = (profile: XmlProfile) => {
    setXmlProfiles((prev) => [...prev, profile]);
  };

  const updateXmlProfile = (updatedProfile: XmlProfile) => {
    setXmlProfiles((prev) => 
      prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p))
    );
  };

  const deleteXmlProfile = (profileId: string) => {
    setXmlProfiles((prev) => prev.filter((p) => p.id !== profileId));
    if (selectedXmlProfileId === profileId) {
      setSelectedXmlProfileId(null);
    }
  };

  const contextValue = useMemo(() => ({
    uploadedFile, setUploadedFile,
    fileType, setFileType,
    xmlProfiles, addXmlProfile, updateXmlProfile, deleteXmlProfile,
    selectedXmlProfileId, setSelectedXmlProfileId,
    csvProfile, setCsvProfile,
    rawData, setRawData,
    processedData, setProcessedData,
    isLoading, setIsLoading,
    error, setError,
    suggestedColumnHeaders: STANDARD_COLUMN_HEADERS,
    isSuggestingValues, setIsSuggestingValues,
  }), [
    uploadedFile, fileType, xmlProfiles, selectedXmlProfileId, csvProfile,
    rawData, processedData, isLoading, error, isSuggestingValues
  ]);

  return (
    <EzConvertContext.Provider value={contextValue}>
      {children}
    </EzConvertContext.Provider>
  );
}

export function useEzConvert() {
  const context = useContext(EzConvertContext);
  if (context === undefined) {
    throw new Error('useEzConvert must be used within an EzConvertProvider');
  }
  return context;
}
