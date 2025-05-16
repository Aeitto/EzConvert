
"use client";
import { useState, useEffect, type FormEvent } from 'react';
import { useEzConvert } from '@/contexts/EzConvertContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Sparkles, AlertCircle, CheckCircle, Save, Edit3 as EditIcon } from 'lucide-react'; // Renamed Edit3 to EditIcon for clarity
import type { ProcessedRow } from '@/types/ezconvert'; // Removed StandardColumnHeader
import { suggestColValuesAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCell: { rowIndex: number; columnId: string; value: any } | null; // columnId is string
  suggestingForColumn: string | null; // columnId is string
}

export function EditDataModal({ isOpen, onClose, editingCell, suggestingForColumn }: EditDataModalProps) {
  const { 
    processedData, 
    setProcessedData, 
    rawData, 
    isSuggestingValues,
    setIsSuggestingValues
  } = useEzConvert();
  
  const [editValue, setEditValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (editingCell) {
      setEditValue(String(editingCell.value ?? ''));
      setSuggestions([]); 
      setError(null);
    } else if (suggestingForColumn && processedData) {
      setEditValue(''); 
      fetchSuggestions(suggestingForColumn);
    } else {
        setSuggestions([]);
        setError(null);
        setEditValue('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingCell, suggestingForColumn]);

  const fetchSuggestions = async (columnId: string) => {
    if (!processedData) return;
    setIsSuggestingValues(true);
    setError(null);
    setSuggestions([]);

    try {
      const existingValues = Array.from(new Set(processedData.map(row => String(row[columnId] ?? '')).filter(val => val.trim() !== '')));
      const allDataSample = JSON.stringify((rawData || processedData).slice(0, 20)); 

      const result = await suggestColValuesAction({
        columnName: columnId,
        existingValues,
        allData: allDataSample,
      });
      
      if (result.suggestedValues && result.suggestedValues.length > 0) {
        setSuggestions(result.suggestedValues);
        toast({ title: "Suggestions Ready", description: `AI suggested ${result.suggestedValues.length} values for ${columnId}.` });
      } else {
        setSuggestions([]);
        toast({ title: "No Suggestions", description: `AI could not find new suggestions for ${columnId}.`, variant: "default" });
      }
    } catch (err: any) {
      console.error("Error fetching suggestions:", err);
      setError(err.message || "Failed to fetch suggestions.");
      toast({ title: "Suggestion Error", description: err.message || "Could not fetch suggestions.", variant: "destructive" });
    } finally {
      setIsSuggestingValues(false);
    }
  };

  const handleSaveEdit = () => {
    if (editingCell && processedData) {
      const newData = [...processedData]; // Create a new array
      // Create a new object for the row being edited
      newData[editingCell.rowIndex] = {
        ...newData[editingCell.rowIndex],
        [editingCell.columnId]: editValue,
      };
      setProcessedData(newData); // Set the new array
      toast({ title: "Cell Updated", description: `Value for ${editingCell.columnId} updated.` });
      onClose();
    }
  };

  const applySuggestionToCell = (suggestion: string) => {
    if (editingCell) {
      setEditValue(suggestion);
    }
  };

  const title = editingCell 
    ? `Edit Value for ${editingCell.columnId}` 
    : suggestingForColumn 
    ? `AI Suggestions for ${suggestingForColumn}` 
    : "Edit Data";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingCell ? <EditIcon className="text-primary" /> : <Sparkles className="text-accent" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-6 py-4">
          {editingCell && (
            <div className="space-y-2">
              <Label htmlFor="edit-cell-value">Value</Label>
              <Input 
                id="edit-cell-value" 
                value={editValue} 
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus 
              />
            </div>
          )}

          {(suggestingForColumn || (editingCell && suggestions.length > 0)) && (
            <div className="mt-4 space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent" /> AI Suggested Values
                {isSuggestingValues && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>}
              </Label>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm p-2 bg-destructive/10 rounded-md">
                  <AlertCircle size={16} /> <span>{error}</span>
                </div>
              )}
              {suggestions.length > 0 ? (
                <ul className="space-y-1 max-h-60 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <li key={i} 
                        className="p-2 border rounded-md text-sm hover:bg-muted/50 cursor-pointer flex justify-between items-center"
                        onClick={() => editingCell ? applySuggestionToCell(s) : toast({title:"Info", description: "Select a cell to apply this suggestion."})}
                    >
                      {s}
                      {editingCell && <Button variant="ghost" size="sm" className="h-auto py-0.5 px-1.5"><CheckCircle size={14} className="mr-1"/>Apply</Button>}
                    </li>
                  ))}
                </ul>
              ) : (
                !isSuggestingValues && !error && <p className="text-sm text-muted-foreground">No suggestions available or yet to be loaded.</p>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          {editingCell && (
            <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save size={16} className="mr-2"/> Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
