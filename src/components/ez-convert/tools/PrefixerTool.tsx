"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Text, Tag, Save, X, Info, Search, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProcessedRow } from '@/types/ezconvert';
import prefixSuggestions from '@/data/prefix-suggestions.json';

interface PrefixerToolProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProcessedRow[];
  onApplyPrefix: (columnId: string, prefix: string) => void;
}

export function PrefixerTool({ isOpen, onClose, data, onApplyPrefix }: PrefixerToolProps) {
  const { toast } = useToast();
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [customPrefix, setCustomPrefix] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewData, setPreviewData] = useState<{ original: string; prefixed: string }[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("suggested");

  // Initialize available columns
  useEffect(() => {
    if (data && data.length > 0) {
      setAvailableColumns(Object.keys(data[0]));
    }
  }, [data]);
  
  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCustomPrefix('');
      setSelectedColumn('');
      setPreviewData([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Generate preview data when column or prefix changes
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
      prefixed: `${customPrefix}${val}`
    }));

    setPreviewData(preview);
  }, [selectedColumn, customPrefix, data]);

  const handleColumnSelect = (value: string) => {
    setSelectedColumn(value);
  };

  const handlePrefixSelect = (prefix: string) => {
    setCustomPrefix(prefix);
  };

  const handleApplyPrefix = () => {
    if (!selectedColumn || !customPrefix) {
      toast({
        title: "Error",
        description: "Please select a column and enter a prefix.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    // Simulate a brief loading period for better UI feedback
    setTimeout(() => {
      onApplyPrefix(selectedColumn, customPrefix);
      
      toast({
        title: "Prefix Applied",
        description: `Successfully applied prefix "${customPrefix}" to ${selectedColumn} column.`
      });
      
      setIsLoading(false);
      onClose();
    }, 500);
  };

  // Filter prefixes based on search query
  const filteredPrefixes = searchQuery 
    ? prefixSuggestions.categories.flatMap(category => 
        category.prefixes.filter(prefix => 
          prefix.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prefix.prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prefix.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Tag className="text-primary" /> Value Prefixer Tool
          </DialogTitle>
          <CardDescription>
            Add a prefix to all values in a column - useful for standardizing SKUs or IDs
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
                <SelectValue placeholder="Select a column to apply prefixes" />
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

          <Tabs defaultValue="suggested" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="suggested">Suggested Prefixes</TabsTrigger>
              <TabsTrigger value="custom">Custom Prefix</TabsTrigger>
            </TabsList>

            <TabsContent value="suggested" className="mt-2">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search prefixes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <ScrollArea className="h-[200px] w-full rounded-md border p-2">
                  {searchQuery ? (
                    <div className="space-y-2">
                      {filteredPrefixes.length > 0 ? (
                        filteredPrefixes.map((prefix, index) => (
                          <Card
                            key={index}
                            className={`cursor-pointer transition-colors ${customPrefix === prefix.prefix ? 'border-primary' : 'hover:bg-muted/50'}`}
                            onClick={() => handlePrefixSelect(prefix.prefix)}
                          >
                            <CardContent className="p-3 flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{prefix.label}</h4>
                                <p className="text-sm text-muted-foreground">{prefix.description}</p>
                              </div>
                              <span className="text-sm font-mono bg-muted p-1 rounded">{prefix.prefix}</span>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground p-4">No matching prefixes found</p>
                      )}
                    </div>
                  ) : (
                    prefixSuggestions.categories.map((category, catIndex) => (
                      <div key={catIndex} className="mb-4">
                        <h3 className="font-medium text-sm mb-2">{category.name}</h3>
                        <div className="space-y-2 ml-2">
                          {category.prefixes.map((prefix, prefixIndex) => (
                            <Card
                              key={prefixIndex}
                              className={`cursor-pointer transition-colors ${customPrefix === prefix.prefix ? 'border-primary' : 'hover:bg-muted/50'}`}
                              onClick={() => handlePrefixSelect(prefix.prefix)}
                            >
                              <CardContent className="p-3 flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium">{prefix.label}</h4>
                                  <p className="text-sm text-muted-foreground">{prefix.description}</p>
                                </div>
                                <span className="text-sm font-mono bg-muted p-1 rounded">{prefix.prefix}</span>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-prefix">Custom Prefix</Label>
                  <Input
                    id="custom-prefix"
                    placeholder="Enter your custom prefix (e.g., NY-)"
                    value={customPrefix}
                    onChange={e => setCustomPrefix(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    This prefix will be added to all values in the selected column.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {selectedColumn && customPrefix && previewData.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  {`Here's how your data will look after applying the prefix "${customPrefix}" to the "${selectedColumn}" column.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-2 border-b">
                    <div className="p-2 font-medium text-center bg-muted">Original Value</div>
                    <div className="p-2 font-medium text-center bg-muted">With Prefix</div>
                  </div>
                  {previewData.map((item, index) => (
                    <div key={index} className="grid grid-cols-2 border-b last:border-0">
                      <div className="p-2 border-r">{item.original}</div>
                      <div className="p-2 font-mono">{item.prefixed}</div>
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
            onClick={handleApplyPrefix}
            disabled={!selectedColumn || !customPrefix || isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Applying...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Apply Prefix
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}