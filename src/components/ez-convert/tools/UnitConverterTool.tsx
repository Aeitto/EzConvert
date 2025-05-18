"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RulerIcon, Save, X, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProcessedRow } from '@/types/ezconvert';

interface UnitConverterToolProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProcessedRow[];
  onApplyConversion: (columnId: string, convertedValues: Record<string, string>) => void;
}

// Unit conversion data
const conversionFactors = {
  // Length conversions to mm as base unit
  "mm": 1,
  "cm": 10,
  "m": 1000,
  // Weight conversions to g as base unit
  "g": 1,
  "kg": 1000,
};

type UnitCategory = "length" | "weight";
type Unit = "mm" | "cm" | "m" | "g" | "kg";

const unitCategories: Record<UnitCategory, Unit[]> = {
  "length": ["mm", "cm", "m"],
  "weight": ["g", "kg"],
};

const unitLabels: Record<Unit, string> = {
  "mm": "Millimeters (mm)",
  "cm": "Centimeters (cm)",
  "m": "Meters (m)",
  "g": "Grams (g)",
  "kg": "Kilograms (kg)",
};

export function UnitConverterTool({ isOpen, onClose, data, onApplyConversion }: UnitConverterToolProps) {
  const { toast } = useToast();
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [targetUnit, setTargetUnit] = useState<Unit>("mm");
  const [categoryType, setCategoryType] = useState<UnitCategory>("length");
  const [previewData, setPreviewData] = useState<{ original: string; converted: string }[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      setTargetUnit("mm");
      setCategoryType("length");
      setPreviewData([]);
    }
  }, [isOpen]);

  // Generate preview data when column or target unit changes
  useEffect(() => {
    if (!selectedColumn || !data || data.length === 0) {
      setPreviewData([]);
      return;
    }

    // Get unique values from the selected column (limit to first 5 for preview)
    const uniqueValues = new Set<string>();
    data.forEach(row => {
      const value = String(row[selectedColumn] ?? '').trim();
      if (value && uniqueValues.size < 5) {
        uniqueValues.add(value);
      }
    });

    // Create preview pairs
    const preview = Array.from(uniqueValues).map(val => ({
      original: val,
      converted: convertValue(val, targetUnit)
    }));

    setPreviewData(preview);
  }, [selectedColumn, targetUnit, categoryType, data]);

  // Extract unit and numeric value from a string
  const parseValueWithUnit = (value: string): { value: number; unit: Unit | null } => {
    const trimmed = value.trim();
    
    // Handle empty values
    if (!trimmed) {
      return { value: 0, unit: null };
    }
    
    // Try to match patterns like "500mm", "10m", "1.5kg", etc.
    const unitMatch = trimmed.match(/^([\d.,]+)\s*([a-zA-Z]+)$/);
    
    if (unitMatch) {
      const numValue = parseFloat(unitMatch[1].replace(',', '.'));
      const unit = unitMatch[2].toLowerCase() as Unit;
      
      // Verify that we know this unit
      if (conversionFactors[unit] !== undefined) {
        return { value: numValue, unit };
      }
    }
    
    // If no unit found or unit not recognized, assume it's just a number
    const numericValue = parseFloat(trimmed.replace(',', '.'));
    if (!isNaN(numericValue)) {
      return { value: numericValue, unit: null };
    }
    
    // If we couldn't parse it at all, return 0
    return { value: 0, unit: null };
  };

  // Convert value to target unit
  const convertValue = (originalValue: string, target: Unit): string => {
    // Check if we have multiple comma-separated values
    if (originalValue.includes(',')) {
      const values = originalValue.split(',').map(v => v.trim());
      // Convert each value and join with line breaks
      return values
        .filter(v => v.length > 0)
        .map(v => convertSingleValue(v, target))
        .join('\n');
    }
    
    return convertSingleValue(originalValue, target);
  };
  
  // Convert a single value to the target unit
  const convertSingleValue = (value: string, target: Unit): string => {
    const { value: numValue, unit } = parseValueWithUnit(value);
    
    if (numValue === 0 && unit === null) {
      return value; // Return original if we couldn't parse it
    }
    
    let baseValue: number;
    
    // Convert to base unit (mm for length, g for weight)
    if (unit) {
      // If we found a unit, convert based on that unit
      baseValue = numValue * conversionFactors[unit];
      
      // Check category compatibility
      const sourceCategory = Object.entries(unitCategories).find(([_, units]) => 
        units.includes(unit)
      )?.[0] as UnitCategory | undefined;
      
      const targetCategory = Object.entries(unitCategories).find(([_, units]) => 
        units.includes(target)
      )?.[0] as UnitCategory | undefined;
      
      // If categories don't match, return original value
      if (sourceCategory !== targetCategory) {
        return value;
      }
    } else {
      // If no unit specified, use the base value for the current category
      baseValue = numValue;
    }
    
    // Convert from base unit to target unit
    const convertedValue = baseValue / conversionFactors[target];
    
    // Format as "00.00"
    return convertedValue.toFixed(2);
  };

  const handleColumnSelect = (value: string) => {
    setSelectedColumn(value);
  };

  const handleUnitSelect = (value: Unit) => {
    setTargetUnit(value);
    
    // Update category type based on the selected unit
    for (const [category, units] of Object.entries(unitCategories)) {
      if (units.includes(value)) {
        setCategoryType(category as UnitCategory);
        break;
      }
    }
  };

  const handleCategorySelect = (value: UnitCategory) => {
    setCategoryType(value);
    // Set default target unit for this category
    setTargetUnit(unitCategories[value][0]);
  };

  const handleApplyConversion = () => {
    if (!selectedColumn) {
      toast({
        title: "Error",
        description: "Please select a column to apply unit conversion.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    // Build a mapping of original values to converted values
    const conversions: Record<string, string> = {};
    
    data.forEach(row => {
      const originalValue = String(row[selectedColumn] ?? '');
      if (originalValue) {
        conversions[originalValue] = convertValue(originalValue, targetUnit);
      }
    });

    // Simulate a brief loading period for better UI feedback
    setTimeout(() => {
      onApplyConversion(selectedColumn, conversions);
      
      toast({
        title: "Conversion Applied",
        description: `Successfully converted values in ${selectedColumn} to ${unitLabels[targetUnit]}.`
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
            <RulerIcon className="text-primary" /> Unit Converter Tool
          </DialogTitle>
          <CardDescription>
            Convert values to standardized units - handles various input formats
          </CardDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4 overflow-y-auto max-h-[calc(80vh-150px)]">
          <div className="space-y-2">
            <Label htmlFor="column-select">Select Column</Label>
            <Select
              value={selectedColumn}
              onValueChange={handleColumnSelect}
            >
              <SelectTrigger id="column-select">
                <SelectValue placeholder="Select a column to apply unit conversion" />
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

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category-select">Unit Category</Label>
              <Select
                value={categoryType}
                onValueChange={(value) => handleCategorySelect(value as UnitCategory)}
              >
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="Select unit category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="length">Length</SelectItem>
                  <SelectItem value="weight">Weight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit-select">Target Unit</Label>
              <Select
                value={targetUnit}
                onValueChange={(value) => handleUnitSelect(value as Unit)}
              >
                <SelectTrigger id="unit-select">
                  <SelectValue placeholder="Select target unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitCategories[categoryType].map(unit => (
                    <SelectItem key={unit} value={unit}>
                      {unitLabels[unit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="mt-2">
            <CardHeader className="pb-1">
              <CardTitle className="text-base">How This Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="mb-2">
                This tool automatically detects units in your data and converts them to your selected target unit.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Handles values like "1234", "500mm", "10m", "14cm"</li>
                <li>Automatically splits comma-separated values like "123, 56" into multiple values</li>
                <li>All results formatted as decimal numbers with 2 decimal places (00.00)</li>
                <li>Values with unrecognized units will be preserved</li>
              </ul>
            </CardContent>
          </Card>

          {selectedColumn && previewData.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  {`Here's how your data will look after converting "${selectedColumn}" to ${unitLabels[targetUnit]}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-2 border-b">
                    <div className="p-2 font-medium text-center bg-muted">Original Value</div>
                    <div className="p-2 font-medium text-center bg-muted">Converted Value</div>
                  </div>
                  {previewData.map((item, index) => (
                    <div key={index} className="grid grid-cols-2 border-b last:border-0">
                      <div className="p-2 border-r whitespace-pre-line">{item.original}</div>
                      <div className="p-2 font-mono whitespace-pre-line">{item.converted}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Showing preview for first 5 unique values only.
                </p>
              </CardContent>
            </Card>
          )}
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
            onClick={handleApplyConversion}
            disabled={!selectedColumn || isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Applying...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Apply Conversion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}