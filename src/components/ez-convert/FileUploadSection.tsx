"use client";
import { useState, useCallback, type ChangeEvent } from 'react';
import { useEzConvert } from '@/contexts/EzConvertContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, FileCode, UploadCloud, AlertCircle } from 'lucide-react';
import type { FileType } from '@/types/ezconvert';
import { readFileAsText } from '@/lib/fileUtils';
import { processUploadedFile } from '@/lib/dataProcessor';
import { useToast } from '@/hooks/use-toast';

export function FileUploadSection() {
  const {
    setUploadedFile,
    fileType,
    setFileType,
    setRawData,
    setProcessedData,
    setIsLoading,
    setError,
    error,
    selectedXmlProfileId,
    xmlProfiles,
    csvProfile,
  } = useEzConvert();
  const [localFile, setLocalFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLocalFile(file);
      setUploadedFile(file); // Also update context
      setError(null); // Clear previous errors
    }
  };

  const handleFileTypeChange = (value: string) => {
    setFileType(value as FileType);
  };

  const handleProcessFile = useCallback(async () => {
    if (!localFile || !fileType) {
      setError("Please select a file and file type.");
      return;
    }

    if (fileType === 'xml' && !selectedXmlProfileId) {
      setError("Please select an XML profile for processing.");
      toast({
        title: "Profile Required",
        description: "An XML profile must be selected to process XML files.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setRawData(null);
    setProcessedData(null);

    try {
      const fileContent = await readFileAsText(localFile);
      const profile = fileType === 'xml' 
        ? xmlProfiles.find(p => p.id === selectedXmlProfileId)
        : csvProfile;

      if (!profile) {
        throw new Error("Profile not found.");
      }
      
      const { rawData: newRawData, processedData: newProcessedData } = await processUploadedFile(localFile, fileType, profile, fileContent);
      
      setRawData(newRawData);
      setProcessedData(newProcessedData);
      toast({
        title: "File Processed",
        description: `${localFile.name} has been processed successfully.`,
      });
    } catch (err: any) {
      console.error("Error processing file:", err);
      setError(err.message || "Failed to process file.");
      toast({
        title: "Processing Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [localFile, fileType, setIsLoading, setError, setRawData, setProcessedData, selectedXmlProfileId, xmlProfiles, csvProfile, toast, setUploadedFile]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <UploadCloud className="text-primary" /> File Upload &amp; Configuration
        </CardTitle>
        <CardDescription>Upload your CSV or XML file and select its type to begin conversion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-type">File Type</Label>
          <Select onValueChange={handleFileTypeChange} value={fileType || undefined}>
            <SelectTrigger id="file-type" className="w-full">
              <SelectValue placeholder="Select file type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileText size={16} /> CSV (Comma Separated Values)
                </div>
              </SelectItem>
              <SelectItem value="xml">
                <div className="flex items-center gap-2">
                  <FileCode size={16} /> XML (Extensible Markup Language)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Upload File</Label>
          <Input 
            id="file-upload" 
            type="file" 
            onChange={handleFileChange} 
            accept={fileType === 'csv' ? '.csv' : fileType === 'xml' ? '.xml' : '.csv,.xml'}
            className="file:text-sm file:font-medium file:text-primary-foreground file:bg-primary hover:file:bg-primary/90 file:rounded-md file:px-3 file:py-1.5 file:mr-3 file:border-0"
          />
          {localFile && <p className="text-sm text-muted-foreground">Selected: {localFile.name}</p>}
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button onClick={handleProcessFile} disabled={!localFile || !fileType || (fileType === 'xml' && !selectedXmlProfileId)} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          Process File
        </Button>
      </CardContent>
    </Card>
  );
}
