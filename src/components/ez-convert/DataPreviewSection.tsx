
"use client";
import { useMemo, useState } from 'react';
import { useEzConvert } from '@/contexts/EzConvertContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Eye, AlertTriangle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuilderScreen } from './BuilderScreen';

export function DataPreviewSection() {
  const { processedData, isLoading, error: processingError } = useEzConvert();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  
  const displayedHeaders = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return [];
    }
    const allKeys = Object.keys(processedData[0]);
    return allKeys.filter(header => 
        processedData.some(row => row[header] !== null && row[header] !== undefined && String(row[header]).trim() !== '')
    );
  }, [processedData]);

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Eye className="text-primary" /> Data Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-3 text-muted-foreground">Processing data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (processingError && !processedData) {
     return (
      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-destructive">
            <AlertTriangle /> Error Previewing Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{processingError}</p>
          <p className="text-sm text-muted-foreground mt-2">Please check your file, file type, and profile configuration, then try processing again.</p>
        </CardContent>
      </Card>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Eye className="text-primary" /> Data Preview
          </CardTitle>
          <CardDescription>Processed data will appear here after successful file processing.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">No data to display. Upload and process a file to see the preview.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Eye className="text-primary" /> Data Preview ({processedData.length} rows)
          </CardTitle>
          <CardDescription>
            Review your converted data and use the Builder for advanced editing.
          </CardDescription>
        </div>
        <Button
          onClick={() => setIsBuilderOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Wrench className="mr-2 h-4 w-4" />
          Open Builder
        </Button>
      </CardHeader>
      <CardContent>
        {displayedHeaders.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap rounded-md border max-h-[600px]">
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                  {displayedHeaders.map((header) => (
                    <TableHead 
                      key={header} 
                      // Removed onClick and title related to AI suggestions
                    >
                      {header}
                      {/* Removed Sparkles icon */}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {displayedHeaders.map((header) => (
                      <TableCell 
                        key={header} 
                        className="max-w-[200px] truncate" // Removed cursor-pointer, hover styles, group
                        title={String(row[header] ?? '')}
                        // Removed onClick related to cell editing
                      >
                        {String(row[header] ?? '')}
                        {/* Removed Edit3 icon */}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-10">No columns with data to display in the preview.</p>
        )}
      </CardContent>
      <BuilderScreen
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
      />
    </Card>
  );
}
