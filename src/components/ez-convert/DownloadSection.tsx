
"use client";
import { useState, useMemo } from 'react'; // Added useMemo
import { useEzConvert } from '@/contexts/EzConvertContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DownloadCloud } from 'lucide-react';
import { convertToCsv } from '@/lib/fileUtils';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type Delimiter = ',' | ';';

export function DownloadSection() {
  const { processedData, uploadedFile } = useEzConvert(); // Removed standardHeaders
  const { toast } = useToast();
  const [selectedDelimiter, setSelectedDelimiter] = useState<Delimiter>(',');

  const downloadHeaders = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return [];
    }
    // Derive headers from the keys of the first processed data row
    return Object.keys(processedData[0]);
  }, [processedData]);

  const handleDownload = () => {
    if (!processedData || processedData.length === 0 || downloadHeaders.length === 0) {
      toast({
        title: "No Data",
        description: "There is no processed data to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Pass dynamically derived headers to convertToCsv
      const csvData = convertToCsv(processedData, downloadHeaders, selectedDelimiter);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const fileName = uploadedFile ? `${uploadedFile.name.split('.')[0]}_converted.csv` : 'converted_data.csv';
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Download Started",
        description: `Converted data is being downloaded as ${fileName}.`,
      });
    } catch (error) {
      console.error("Error generating CSV for download:", error);
      toast({
        title: "Download Error",
        description: "Failed to prepare data for download.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <DownloadCloud className="text-primary" /> Download Converted Data
        </CardTitle>
        <CardDescription>Download your processed data in a standardized CSV format. Choose your preferred delimiter.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="delimiter-select">CSV Delimiter</Label>
          <Select 
            value={selectedDelimiter} 
            onValueChange={(value) => setSelectedDelimiter(value as Delimiter)}
          >
            <SelectTrigger id="delimiter-select" className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select delimiter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=",">Comma (,)</SelectItem>
              <SelectItem value=";">Semicolon (;)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleDownload} 
          disabled={!processedData || processedData.length === 0}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Download as CSV
        </Button>
        {(!processedData || processedData.length === 0) && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Process a file to enable download.</p>
        )}
      </CardContent>
    </Card>
  );
}
