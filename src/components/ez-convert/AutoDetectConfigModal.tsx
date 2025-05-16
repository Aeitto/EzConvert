
"use client";
import { useState, type FormEvent, useEffect } from 'react'; // Added useEffect
import { useEzConvert } from '@/contexts/EzConvertContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Sparkles, AlertCircle } from 'lucide-react'; // Removed Copy
import { readFileAsDataURL } from '@/lib/fileUtils';
import { detectXmlConfigAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AutoDetectXmlConfigOutput } from '@/ai/flows/auto-detect-xml-config'; // Import the type

interface AutoDetectConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigDetected: (configOutput: AutoDetectXmlConfigOutput, description: string) => void; // Changed signature
}

export function AutoDetectConfigModal({ isOpen, onClose, onConfigDetected }: AutoDetectConfigModalProps) {
  const { uploadedFile, isDetectingConfig, setIsDetectingConfig } = useEzConvert();
  const [description, setDescription] = useState('');
  // Removed suggestedConfig state as we now pass structured data directly
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      setError("Please upload an XML file first via the main upload section.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide a description of the XML data structure.");
      return;
    }

    setIsDetectingConfig(true);
    setError(null);
    // setSuggestedConfig(''); // Not needed

    try {
      const xmlDataUri = await readFileAsDataURL(uploadedFile);
      const result = await detectXmlConfigAction({ xmlDataUri, description }); // result is now AutoDetectXmlConfigOutput
      
      // Check if result and essential parts are present
      if (result && result.itemRootPathSuggestion && result.fieldMappingsSuggestion) {
        onConfigDetected(result, description); // Pass the structured result up
        toast({ title: "Configuration Suggested!", description: "AI has suggested a configuration. Review and finalize it in the profile form." });
        // onClose(); // Optionally close this modal, ProfileManagementSection will open ProfileFormModal
      } else {
        throw new Error("AI did not return a complete suggestion. Missing item root path or field mappings.");
      }
    } catch (err: any) {
      console.error("Error auto-detecting config:", err);
      const errorMessage = err.message || "Failed to auto-detect configuration. The AI might have had trouble with the input or structure.";
      setError(errorMessage);
      toast({ title: "Detection Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsDetectingConfig(false);
    }
  };
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Optionally pre-fill description if one was attempted before
      // setDescription(''); // Or keep previous description
      setError(null);
    } else {
      // Clear description when closing if not already handled by reopening
      setDescription(''); 
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-accent" /> AI Auto-Detect XML Configuration
          </DialogTitle>
        </DialogHeader>
        {/* Removed ScrollArea from around form for simpler layout, content might not always overflow */}
        <form onSubmit={handleSubmit} className="space-y-4 py-4 flex-grow flex flex-col">
          <div className="flex-grow space-y-4 px-1 overflow-y-auto"> {/* Content that scrolls */}
            {!uploadedFile && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-center gap-2">
                    <AlertCircle size={16}/> Please upload an XML file in the main section first.
                </div>
            )}
            <div>
              <Label htmlFor="xml-description">Description of XML Data & Desired Output</Label>
              <Textarea
                id="xml-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., This XML contains product details. Each product is an <item>. The name is in <productName> and price in <productPrice>. Images are in <imgs/img>, each to a new column like 'ImageURL1', 'ImageURL2'. Attributes like <a name='Color'>Red</a> should have 'Color' as column and 'Red' as value."
                rows={6}
                required
                disabled={isDetectingConfig}
              />
              <p className="text-xs text-muted-foreground mt-1">Provide details about the XML structure and how you want it mapped to columns to help the AI.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div> {/* End scrollable content */}
          
          <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} disabled={isDetectingConfig}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!uploadedFile || isDetectingConfig || !description.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isDetectingConfig ? 'Detecting...' : 'Detect Configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

