"use client";
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Save, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import headerSuggestions from '@/data/header-suggestions.json';

interface HeaderSwapperToolProps {
  isOpen: boolean;
  onClose: () => void;
  currentHeader: string;
  onSwapHeader: (newHeader: string) => void;
}

export function HeaderSwapperTool({ isOpen, onClose, currentHeader, onSwapHeader }: HeaderSwapperToolProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHeader, setSelectedHeader] = useState<string>('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with the current header
  useEffect(() => {
    if (isOpen) {
      setSelectedHeader(currentHeader);
      setSearchQuery('');
      // Focus the input field when the dialog opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, currentHeader]);

  // Filter suggestions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      // If no search query, show all suggestions flattened
      const allHeaders = headerSuggestions.suggestions.flatMap(category => category.headers);
      setFilteredSuggestions(allHeaders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches: string[] = [];

    // Search through all categories and headers
    headerSuggestions.suggestions.forEach(category => {
      category.headers.forEach(header => {
        if (header.toLowerCase().includes(query)) {
          matches.push(header);
        }
      });
    });

    setFilteredSuggestions(matches);
  }, [searchQuery]);

  const handleApplyChange = () => {
    if (!selectedHeader) {
      toast({
        title: "Error",
        description: "Please select a header name.",
        variant: "destructive"
      });
      return;
    }

    onSwapHeader(selectedHeader);
    
    toast({
      title: "Header Changed",
      description: `Successfully changed header to "${selectedHeader}".`
    });
    
    onClose();
  };

  const handleHeaderSelect = (header: string) => {
    setSelectedHeader(header);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">Change Column Header</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="current-header">Current Header</Label>
            <div className="flex w-full items-center p-2 border rounded-md bg-muted/30">
              {currentHeader}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="header-search">Search Headers</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                id="header-search"
                className="pl-9"
                placeholder="Type to search headers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select New Header</Label>
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <div className="p-4">
                {filteredSuggestions.map((header, index) => (
                  <div
                    key={index}
                    className={`p-2 cursor-pointer rounded-md mb-1 ${
                      selectedHeader === header ? 'bg-primary/20 font-semibold' : 'hover:bg-muted'
                    }`}
                    onClick={() => handleHeaderSelect(header)}
                  >
                    {header}
                  </div>
                ))}
                {filteredSuggestions.length === 0 && (
                  <div className="text-center text-muted-foreground p-4">
                    No matching headers found
                  </div>
                )}
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleApplyChange}
            disabled={!selectedHeader}
          >
            <Save className="w-4 h-4 mr-2" /> Apply Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}