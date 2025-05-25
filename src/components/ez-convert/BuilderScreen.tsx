"use client";
import { useState, useEffect } from 'react';
import { useEzConvert } from '@/contexts/EzConvertContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogClose, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Undo2, Redo2, Save, X, ArrowLeft, Shuffle, Edit2, Tag, RulerIcon, SplitSquareVertical } from 'lucide-react';
import { SwapperTool } from './tools/SwapperTool';
import { PrefixerTool } from './tools/PrefixerTool';
import { UnitConverterTool } from './tools/UnitConverterTool';
import { AttributeDetectionTool } from './tools/AttributeDetectionTool';
import { HeaderSwapperTool } from './HeaderSwapperTool';
import { useToast } from '@/hooks/use-toast';
import type { ProcessedRow } from '@/types/ezconvert';

interface BuilderScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BuilderScreen({ isOpen, onClose }: BuilderScreenProps) {
  const { processedData, setProcessedData } = useEzConvert();
  const { toast } = useToast();
  
  // State for undo/redo functionality
  const [history, setHistory] = useState<ProcessedRow[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [currentData, setCurrentData] = useState<ProcessedRow[] | null>(null);
  const [isSwapperOpen, setIsSwapperOpen] = useState<boolean>(false);
  const [isPrefixerOpen, setIsPrefixerOpen] = useState<boolean>(false);
  const [isUnitConverterOpen, setIsUnitConverterOpen] = useState<boolean>(false);
  const [isAttributeDetectionOpen, setIsAttributeDetectionOpen] = useState<boolean>(false);
  const [isHeaderSwapperOpen, setIsHeaderSwapperOpen] = useState<boolean>(false);
  const [currentHeaderToSwap, setCurrentHeaderToSwap] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  useEffect(() => {
    if (isOpen && processedData) {
      setCurrentData([...processedData]);
      setHistory([processedData]);
      setHistoryIndex(0);
    }
  }, [isOpen, processedData]);
  
  const displayedHeaders = currentData && currentData.length > 0 
    ? Object.keys(currentData[0])
    : [];
  
  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentData([...history[newIndex]]);
      toast({
        title: "Undo",
        description: "Previous action undone",
      });
    }
  };
  
  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentData([...history[newIndex]]);
      toast({
        title: "Redo",
        description: "Action redone",
      });
    }
  };
  
  // Save changes to the main application state
  const handleSave = () => {
    if (!currentData || !hasUnsavedChanges) return;
    
    setIsLoading(true);
    
    // Simulate a brief loading period for better UI feedback
    setTimeout(() => {
      setProcessedData(currentData);
      setHasUnsavedChanges(false);
      setIsLoading(false);
      
      toast({
        title: "Changes Saved",
        description: "Your changes have been applied to the data",
      });
    }, 500);
  };
  
  // Add a new action to history
  const addToHistory = (newData: ProcessedRow[]) => {
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    // Add the new state
    newHistory.push([...newData]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setHasUnsavedChanges(true);
  };
  
  // Handle data cell editing (placeholder for future implementation)
  // Handle header name editing
  const handleHeaderEdit = (header: string) => {
    setCurrentHeaderToSwap(header);
    setIsHeaderSwapperOpen(true);
  };

  // Handle header name swap
  const handleHeaderSwap = (newHeaderName: string) => {
    if (!currentData || !currentHeaderToSwap || newHeaderName === currentHeaderToSwap) return;
    
    // Create a new array of data with the header (column) renamed
    const newData = currentData.map(row => {
      const newRow = { ...row };
      // Create the new key with the old value
      newRow[newHeaderName] = row[currentHeaderToSwap];
      // Delete the old key
      delete newRow[currentHeaderToSwap];
      return newRow;
    });
    
    setCurrentData(newData);
    addToHistory(newData);
    
    toast({
      title: "Header Renamed",
      description: `Successfully renamed header from "${currentHeaderToSwap}" to "${newHeaderName}"`,
    });
  };

  const handleCellEdit = (rowIndex: number, columnId: string, value: string) => {
    if (!currentData) return;
    
    const newData = [...currentData];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [columnId]: value,
    };
    
    setCurrentData(newData);
    addToHistory(newData);
  };

  if (!currentData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-none w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="sr-only">Data Transformation Builder</DialogTitle>
          {/* Main action buttons (Undo, Redo, Save, Close) are now here */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={handleUndo} disabled={historyIndex <= 0 || isLoading} className="transition-all hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2">
                      <Undo2 className="h-4 w-4 mr-2" /> Undo
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={handleRedo} disabled={historyIndex >= history.length - 1 || isLoading} className="transition-all hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2">
                      <Redo2 className="h-4 w-4 mr-2" /> Redo
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {hasUnsavedChanges && (
                <div className="text-sm text-yellow-500 dark:text-yellow-400 flex items-center mr-4">
                  <span className="animate-pulse mr-1.5">●</span> Unsaved Changes
                </div>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleSave} disabled={!hasUnsavedChanges || isLoading} className="transition-all bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2">
                      {isLoading ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" /> Save Changes
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={onClose} className="transition-all hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2" disabled={isLoading}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back to Preview
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="ml-auto">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>
        
        {/* Main content area */}
        <div className="flex-grow flex flex-col p-4 gap-4 overflow-hidden">
          {/* Tools Section - Title moved here */}
          <Card className="flex-shrink-0 bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>Data Builder</CardTitle>
              <CardDescription>
                Edit and transform your data with advanced tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3">
              {/* Value Swapper Tool Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => setIsSwapperOpen(true)} className="w-full flex flex-col h-auto p-3 transition-all hover:shadow-lg hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2">
                      <Shuffle className="h-6 w-6 mb-1" />
                      Value Swapper
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
              {/* Prefixer Tool Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => setIsPrefixerOpen(true)} className="w-full flex flex-col h-auto p-3 transition-all hover:shadow-lg hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2">
                      <Tag className="h-6 w-6 mb-1" />
                      Prefixer
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
              {/* Unit Converter Tool Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => setIsUnitConverterOpen(true)} className="w-full flex flex-col h-auto p-3 transition-all hover:shadow-lg hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2">
                      <RulerIcon className="h-6 w-6 mb-1" />
                      Unit Converter
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
              {/* Attribute Detection Tool Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => setIsAttributeDetectionOpen(true)} className="w-full flex flex-col h-auto p-3 transition-all hover:shadow-lg hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2">
                      <SplitSquareVertical className="h-6 w-6 mb-1" />
                      Attribute Detection
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
              {/* Header Swapper Tool Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => setIsHeaderSwapperOpen(true)} className="w-full flex flex-col h-auto p-3 transition-all hover:shadow-lg hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2" disabled={!displayedHeaders.length}>
                      <Edit2 className="h-6 w-6 mb-1" />
                      Header Swapper
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>

          {/* Data Table */}
          <div className="flex-grow mt-4 overflow-hidden">
            {displayedHeaders.length > 0 ? (
              <ScrollArea className="w-full h-[calc(80vh-150px)] whitespace-nowrap rounded-md border">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-secondary z-10">
                    <TableRow>
                      {displayedHeaders.map((header) => (
                        <TableHead
                          key={header}
                          className="group cursor-pointer"
                          onClick={() => handleHeaderEdit(header)}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center">
                                  {header}
                                  <Edit2 className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to edit header name</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {displayedHeaders.map((header) => (
                          <TableCell 
                            key={header} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              // In the future, this will open a cell editor
                              const currentValue = String(row[header] ?? '');
                              // For now, just show a toast with the current value
                              toast({
                                title: "Cell Editing",
                                description: "Cell editor will be implemented in future updates",
                              });
                              // Mark as having unsaved changes
                              setHasUnsavedChanges(true);
                            }}
                          >
                            {String(row[header] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-10">No data to display.</p>
            )}
          </div>
        </div>
        
        {/* Swapper Tool */}
        <SwapperTool
          isOpen={isSwapperOpen}
          onClose={() => setIsSwapperOpen(false)}
          data={currentData || []}
          onSwapValues={(columnId, mappings, isMultiValue = false) => {
            if (!currentData) return;
            
            const newData = currentData.map(row => {
              const originalValue = String(row[columnId] ?? '');
              if (mappings[originalValue]) {
                const mappedValue = mappings[originalValue];
                
                // Handle multi-value mode with line breaks
                if (isMultiValue && mappedValue.includes('\n')) {
                  // Store the multi-line value as is, it will be displayed properly in the UI
                  return {
                    ...row,
                    [columnId]: mappedValue
                  };
                } else {
                  // Regular single value mapping
                  return {
                    ...row,
                    [columnId]: mappedValue
                  };
                }
              }
              return row;
            });
            
            setCurrentData(newData);
            addToHistory(newData);
            
            toast({
              title: "Values Mapped",
              description: `Successfully applied value mappings to ${columnId} column.`
            });
          }}
        />

        {/* Header Swapper Tool */}
        <HeaderSwapperTool
          isOpen={isHeaderSwapperOpen}
          onClose={() => setIsHeaderSwapperOpen(false)}
          currentHeader={currentHeaderToSwap}
          onSwapHeader={handleHeaderSwap}
        />

        {/* Prefixer Tool */}
        <PrefixerTool
          isOpen={isPrefixerOpen}
          onClose={() => setIsPrefixerOpen(false)}
          data={currentData || []}
          onApplyPrefix={(columnId, prefix) => {
            if (!currentData) return;
            
            const newData = currentData.map(row => {
              const originalValue = String(row[columnId] ?? '');
              if (originalValue) {
                return {
                  ...row,
                  [columnId]: `${prefix}${originalValue}`
                };
              }
              return row;
            });
            
            setCurrentData(newData);
            addToHistory(newData);
            
            toast({
              title: "Prefix Applied",
              description: `Successfully applied prefix "${prefix}" to ${columnId} column.`
            });
          }}
        />

        {/* Unit Converter Tool */}
        <UnitConverterTool
          isOpen={isUnitConverterOpen}
          onClose={() => setIsUnitConverterOpen(false)}
          data={currentData || []}
          onApplyConversion={(columnId, conversions) => {
            if (!currentData) return;
            
            const newData = currentData.map(row => {
              const originalValue = String(row[columnId] ?? '');
              if (originalValue && conversions[originalValue]) {
                return {
                  ...row,
                  [columnId]: conversions[originalValue]
                };
              }
              return row;
            });
            
            setCurrentData(newData);
            addToHistory(newData);
            
            toast({
              title: "Unit Conversion Applied",
              description: `Successfully converted values in ${columnId} column.`
            });
          }}
        />

        {/* Attribute Detection Tool */}
        <AttributeDetectionTool
          isOpen={isAttributeDetectionOpen}
          onClose={() => setIsAttributeDetectionOpen(false)}
          data={currentData || []}
          onApplyAttributeDetection={(sourceColumnId, detectedAttributes) => {
            if (!currentData) return;
            
            // Create a new array of data with the additional columns
            let newData = [...currentData];
            
            // Add new columns with extracted attribute values
            Object.entries(detectedAttributes).forEach(([attrKey, attrData]) => {
              const { columnName, values } = attrData;
              
              // Add the new column to each row
              newData = newData.map((row, rowIndex) => {
                // If we have a value for this row, add it
                if (values[rowIndex]) {
                  return {
                    ...row,
                    [columnName]: values[rowIndex]
                  };
                }
                // Otherwise, add an empty string
                return {
                  ...row,
                  [columnName]: ''
                };
              });
            });
            
            setCurrentData(newData);
            addToHistory(newData);
            
            toast({
              title: "Attributes Extracted",
              description: `Successfully extracted attributes from ${sourceColumnId} column.`
            });
          }}
        />

      </DialogContent>
    </Dialog>
  );
}