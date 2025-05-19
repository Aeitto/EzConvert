"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SplitSquareVertical, Save, X, Info, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProcessedRow } from '@/types/ezconvert';

interface AttributeDetectionToolProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProcessedRow[];
  onApplyAttributeDetection: (
    sourceColumnId: string, 
    detectedAttributes: Record<string, { columnName: string, values: Record<string, string> }>
  ) => void;
}

// Regex patterns for detecting common attribute patterns
const attributePatterns = [
  // Pattern for "5 x max 10W led" - quantity x max wattage
  {
    id: "quantity_wattage",
    name: "Quantity & Wattage",
    description: "Detects patterns like '5 x max 10W' and extracts quantity and wattage",
    regex: /(\d+)\s*x\s*(?:max\s*)?(\d+[.,]?\d*\s*W)/i,
    attributeNames: ["Power source count", "Maximum Wattage per source"],
    extractValues: (match: RegExpMatchArray) => {
      return [match[1], match[2]];
    }
  },
  // Pattern for dimensions like "10x20x30 cm"
  {
    id: "dimensions",
    name: "Dimensions",
    description: "Detects dimension patterns like '10x20x30 cm'",
    regex: /(\d+[.,]?\d*)\s*x\s*(\d+[.,]?\d*)\s*x\s*(\d+[.,]?\d*)\s*(cm|mm|m)?/i,
    attributeNames: ["Width", "Height", "Depth"],
    extractValues: (match: RegExpMatchArray) => {
      return [
        match[1] + (match[4] ? ` ${match[4]}` : ""), 
        match[2] + (match[4] ? ` ${match[4]}` : ""), 
        match[3] + (match[4] ? ` ${match[4]}` : "")
      ];
    }
  },
  // Pattern for range values like "5-10V" or "100-240V"
  {
    id: "range",
    name: "Value Range",
    description: "Detects range patterns like '100-240V'",
    regex: /(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)\s*([A-Za-z]+)/i,
    attributeNames: ["Minimum Value", "Maximum Value"],
    extractValues: (match: RegExpMatchArray) => {
      return [match[1] + match[3], match[2] + match[3]];
    }
  }
];

export function AttributeDetectionTool({ 
  isOpen, 
  onClose, 
  data, 
  onApplyAttributeDetection 
}: AttributeDetectionToolProps) {
  const { toast } = useToast();
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [detectedPatterns, setDetectedPatterns] = useState<{
    patternId: string;
    count: number;
    examples: string[];
    attributeNames: string[];
    isSelected: boolean;
  }[]>([]);
  const [customColumnNames, setCustomColumnNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Initialize available columns
  useEffect(() => {
    if (data && data.length > 0) {
      setAvailableColumns(Object.keys(data[0]));
    }
  }, [data]);
  
  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColumn('');
      setDetectedPatterns([]);
      setCustomColumnNames({});
    }
  }, [isOpen]);

  const handleColumnSelect = (value: string) => {
    setSelectedColumn(value);
    setDetectedPatterns([]);
    setCustomColumnNames({});
  };

  const handleDetectPatterns = () => {
    if (!selectedColumn || !data || data.length === 0) {
      return;
    }

    setIsDetecting(true);

    // Get all values from the selected column
    const columnValues = data.map(row => String(row[selectedColumn] ?? '')).filter(val => val.trim() !== '');
    
    // Detect patterns in the data
    const detectedResults: Record<string, { count: number; examples: string[] }> = {};
    
    // Check each pattern against each value
    columnValues.forEach(value => {
      attributePatterns.forEach(pattern => {
        const match = value.match(pattern.regex);
        if (match) {
          if (!detectedResults[pattern.id]) {
            detectedResults[pattern.id] = { count: 0, examples: [] };
          }
          
          detectedResults[pattern.id].count++;
          
          // Store up to 3 examples
          if (detectedResults[pattern.id].examples.length < 3 && 
              !detectedResults[pattern.id].examples.includes(value)) {
            detectedResults[pattern.id].examples.push(value);
          }
        }
      });
    });
    
    // Format the results
    const formattedResults = Object.entries(detectedResults).map(([patternId, result]) => {
      const pattern = attributePatterns.find(p => p.id === patternId);
      return {
        patternId,
        count: result.count,
        examples: result.examples,
        attributeNames: pattern?.attributeNames || [],
        isSelected: result.count > 0
      };
    });
    
    // Sort by count (descending)
    formattedResults.sort((a, b) => b.count - a.count);
    
    setDetectedPatterns(formattedResults);
    
    // Initialize custom column names with the default attribute names
    const initialColumnNames: Record<string, string> = {};
    formattedResults.forEach(result => {
      const pattern = attributePatterns.find(p => p.id === result.patternId);
      if (pattern) {
        pattern.attributeNames.forEach((name, index) => {
          initialColumnNames[`${result.patternId}_${index}`] = name;
        });
      }
    });
    
    setCustomColumnNames(initialColumnNames);
    setIsDetecting(false);
    
    if (formattedResults.length === 0) {
      toast({
        title: "No patterns detected",
        description: "No recognizable attribute patterns were found in the selected column.",
        variant: "destructive"
      });
    }
  };

  const handleTogglePattern = (patternId: string) => {
    setDetectedPatterns(prev => 
      prev.map(pattern => 
        pattern.patternId === patternId 
          ? { ...pattern, isSelected: !pattern.isSelected } 
          : pattern
      )
    );
  };

  const handleColumnNameChange = (key: string, value: string) => {
    setCustomColumnNames(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyAttributeDetection = () => {
    if (!selectedColumn || detectedPatterns.length === 0) {
      toast({
        title: "Error",
        description: "Please select a column and detect attribute patterns first.",
        variant: "destructive"
      });
      return;
    }

    const selectedPatterns = detectedPatterns.filter(pattern => pattern.isSelected);
    
    if (selectedPatterns.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one detected pattern to apply.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    // Create a mapping of detected attributes for each pattern
    const detectedAttributes: Record<string, { columnName: string, values: Record<string, string> }> = {};
    
    selectedPatterns.forEach(patternResult => {
      const pattern = attributePatterns.find(p => p.id === patternResult.patternId);
      
      if (pattern) {
        // For each attribute in the pattern
        pattern.attributeNames.forEach((_, index) => {
          const columnKey = `${patternResult.patternId}_${index}`;
          const columnName = customColumnNames[columnKey];
          
          // Initialize the attribute entry
          detectedAttributes[columnKey] = {
            columnName,
            values: {}
          };
          
          // Process each row to extract the attribute value
          data.forEach((row, rowIndex) => {
            const originalValue = String(row[selectedColumn] ?? '');
            const match = originalValue.match(pattern.regex);
            
            if (match) {
              const extractedValues = pattern.extractValues(match);
              detectedAttributes[columnKey].values[rowIndex] = extractedValues[index];
            }
          });
        });
      }
    });

    // Simulate a brief loading period for better UI feedback
    setTimeout(() => {
      onApplyAttributeDetection(selectedColumn, detectedAttributes);
      
      toast({
        title: "Attributes Extracted",
        description: `Successfully extracted attributes from ${selectedColumn} column.`
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
            <SplitSquareVertical className="text-primary" /> Attribute Detection Tool
          </DialogTitle>
          <CardDescription>
            Detect and extract multiple attributes from complex text values
          </CardDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4 overflow-y-auto max-h-[calc(80vh-150px)]">
          <div className="space-y-2">
            <Label htmlFor="column-select">Select Column</Label>
            <div className="flex gap-2">
              <Select
                value={selectedColumn}
                onValueChange={handleColumnSelect}
              >
                <SelectTrigger id="column-select" className="flex-grow">
                  <SelectValue placeholder="Select a column to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map(column => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleDetectPatterns} 
                disabled={!selectedColumn || isDetecting}
                variant="outline"
              >
                {isDetecting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Detecting...
                  </>
                ) : (
                  "Detect Patterns"
                )}
              </Button>
            </div>
          </div>

          <Card className="mt-2">
            <CardHeader className="pb-1">
              <CardTitle className="text-base">How This Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="mb-2">
                This tool analyzes your data to find complex attributes that can be split into multiple columns.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Detects patterns like "5 x max 10W led" and extracts quantity and wattage</li>
                <li>Creates new columns for each detected attribute</li>
                <li>You can customize the names of the new columns</li>
                <li>Original data remains unchanged</li>
              </ul>
            </CardContent>
          </Card>

          {detectedPatterns.length > 0 ? (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Detected Patterns</CardTitle>
                <CardDescription>
                  Select which patterns to extract and customize column names
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {detectedPatterns.map((pattern) => {
                    const patternDef = attributePatterns.find(p => p.id === pattern.patternId);
                    return (
                      <div key={pattern.patternId} className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={pattern.isSelected}
                              onCheckedChange={() => handleTogglePattern(pattern.patternId)}
                              id={`pattern-${pattern.patternId}`}
                            />
                            <Label htmlFor={`pattern-${pattern.patternId}`} className="font-medium">
                              {patternDef?.name || pattern.patternId}
                            </Label>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            Found in {pattern.count} {pattern.count === 1 ? 'value' : 'values'}
                          </span>
                        </div>
                        
                        <p className="text-sm mb-2">{patternDef?.description}</p>
                        
                        <div className="bg-muted/30 p-2 rounded-md mb-3">
                          <p className="text-sm font-medium mb-1">Examples:</p>
                          <ul className="text-sm space-y-1">
                            {pattern.examples.map((example, i) => (
                              <li key={i}>{example}</li>
                            ))}
                          </ul>
                        </div>
                        
                        {pattern.isSelected && (
                          <div className="space-y-3 mt-3">
                            <p className="text-sm font-medium">New column names:</p>
                            {pattern.attributeNames.map((attrName, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <Input
                                  value={customColumnNames[`${pattern.patternId}_${index}`] || attrName}
                                  onChange={(e) => handleColumnNameChange(`${pattern.patternId}_${index}`, e.target.value)}
                                  placeholder={`Name for ${attrName}`}
                                  className="flex-grow"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : selectedColumn ? (
            <div className="text-center p-6 border rounded-md bg-muted/20 mt-4">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p>No patterns detected yet. Click "Detect Patterns" to analyze the data.</p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleApplyAttributeDetection}
            disabled={!selectedColumn || detectedPatterns.length === 0 || isLoading || 
                     !detectedPatterns.some(p => p.isSelected)}
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Applying...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Extract Attributes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
