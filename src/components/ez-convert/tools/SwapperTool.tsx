"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shuffle, Plus, X, Save, ArrowRight, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProcessedRow } from '@/types/ezconvert';

interface SwapperToolProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProcessedRow[];
  onSwapValues: (columnId: string, mappings: Record<string, string>, isMultiValue?: boolean) => void;
}

export function SwapperTool({ isOpen, onClose, data, onSwapValues }: SwapperToolProps) {
  const { toast } = useToast();
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [multiValueMode, setMultiValueMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize available columns
  useEffect(() => {
    if (data && data.length > 0) {
      setAvailableColumns(Object.keys(data[0]));
    }
  }, [data]);

  // Find unique values in the selected column
  useEffect(() => {
    if (!selectedColumn || !data || data.length === 0) {
      setUniqueValues([]);
      return;
    }

    const values = new Set<string>();
    
    data.forEach(row => {
      const value = String(row[selectedColumn] ?? '').trim();
      if (value) {
        values.add(value);
      }
    });

    const uniqueValuesArray = Array.from(values);
    setUniqueValues(uniqueValuesArray);
    
    // Initialize mappings with original values
    const initialMappings: Record<string, string> = {};
    uniqueValuesArray.forEach(value => {
      initialMappings[value] = value;
    });
    setMappings(initialMappings);
  }, [selectedColumn, data]);

  const handleColumnSelect = (value: string) => {
    setSelectedColumn(value);
  };

  const handleMappingChange = (originalValue: string, newValue: string) => {
    setMappings(prev => ({
      ...prev,
      [originalValue]: newValue
    }));
  };

  const formatMultiValues = (value: string): string => {
    // If it's not in multi-value mode, return as is
    if (!multiValueMode) return value;
    
    // Handle comma-separated values
    if (value.includes(',')) {
      return value.split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0)
        .join('\n');
    }
    
    return value;
  };

  const handleApplyMappings = () => {
    if (!selectedColumn) {
      toast({
        title: "Error",
        description: "Please select a column to apply mappings.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const processedMappings = { ...mappings };
    
    // Process the mappings to handle multi-line inputs
    if (multiValueMode) {
      Object.keys(processedMappings).forEach(key => {
        // Ensure we have proper line breaks for storage and processing
        processedMappings[key] = processedMappings[key].replace(/\r\n/g, '\n');
      });
    }

    // Simulate a brief loading period for better UI feedback
    setTimeout(() => {
      onSwapValues(selectedColumn, processedMappings, multiValueMode);
      
      toast({
        title: "Values Mapped",
        description: `Successfully mapped values in ${selectedColumn} column.`
      });
      
      setIsLoading(false);
      onClose();
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shuffle className="text-primary" /> Value Swapper Tool
          </DialogTitle>
          <CardDescription>
            Map multiple unique values in a column to standardized values
          </CardDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4 overflow-y-auto max-h-[calc(80vh-150px)]">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="column-select">Select Column</Label>
              <Select
                value={selectedColumn}
                onValueChange={handleColumnSelect}
              >
                <SelectTrigger id="column-select">
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map(column => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end mb-4 space-x-2">
            <Label htmlFor="multi-value-mode" className="text-sm cursor-pointer">
              Multi-Value Mode
            </Label>
            <Switch
              id="multi-value-mode"
              checked={multiValueMode}
              onCheckedChange={setMultiValueMode}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center rounded-full h-5 w-5 bg-muted">
                    <Info className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    In multi-value mode, you can map a single value to multiple values separated by line breaks.
                    Values like "black,white" can be automatically split into separate lines.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {selectedColumn && uniqueValues.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mapping Values for: {selectedColumn}</CardTitle>
                <CardDescription>
                  Found {uniqueValues.length} unique values. Define how these values should be mapped.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uniqueValues.map((value, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-grow border rounded p-2 bg-muted/30">
                        {value}
                      </div>
                      <ArrowRight className="text-muted-foreground" />
                      <div className="flex-grow">
                        {multiValueMode ? (
                          <Textarea
                            value={mappings[value] || formatMultiValues(value)}
                            onChange={(e) => handleMappingChange(value, e.target.value)}
                            placeholder="Enter mapped values (one per line)"
                            className="min-h-[80px]"
                          />
                        ) : (
                          <Input
                            value={mappings[value] || ''}
                            onChange={(e) => handleMappingChange(value, e.target.value)}
                            placeholder="Enter mapped value"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : selectedColumn ? (
            <div className="text-center p-4 border rounded bg-muted/20">
              No unique values found in the selected column or column contains only empty values.
            </div>
          ) : (
            <div className="text-center p-4 border rounded bg-muted/20">
              Select a column to see its unique values.
            </div>
          )}
        </div>

        <DialogFooter className="mt-auto pt-4 border-t flex justify-between items-center">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleApplyMappings}
            disabled={!selectedColumn || uniqueValues.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Applying...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Apply Mappings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}