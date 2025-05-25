"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Save, X, AlertCircle, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateUUID } from '@/lib/utils';
import type { XmlProfileFieldMapping } from '@/types/ezconvert';

interface XmlAiDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetectionComplete: (rootPath: string, fieldMappings: XmlProfileFieldMapping[]) => void;
}

interface ApiXPathSuggestion {
  fieldName: string;
  xpath: string;
}

export function XmlAiDetectionModal({ 
  isOpen, 
  onClose, 
  onDetectionComplete 
}: XmlAiDetectionModalProps) {
  const { toast } = useToast();
  const [xmlSample, setXmlSample] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [detectedRootPath, setDetectedRootPath] = useState<string>('');
  const [detectedMappings, setDetectedMappings] = useState<XmlProfileFieldMapping[]>([]);
  const [isDetectionComplete, setIsDetectionComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [usedProvider, setUsedProvider] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'openrouter' | 'requesty'>('openrouter');

  const handleXmlSampleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setXmlSample(e.target.value);
    setIsDetectionComplete(false);
    setDetectedRootPath('');
    setDetectedMappings([]);
    setError(null);
  };

  const handleProviderChange = (value: 'openrouter' | 'requesty') => {
    setSelectedProvider(value);
    setIsDetectionComplete(false);
    setDetectedMappings([]);
    setDetectedRootPath('');
    setError(null);
    setUsedModel(null);
    setUsedProvider(null);
  };

  const handleDetectStructure = async () => {
    if (!xmlSample.trim()) {
      toast({
        title: "Error",
        description: "Please provide an XML sample to analyze.",
        variant: "destructive"
      });
      setError("Please provide an XML sample to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setDetectedMappings([]);
    setDetectedRootPath('');
    setIsDetectionComplete(false);
    setUsedModel(null);
    setUsedProvider(null);

    try {
      const response = await fetch('/api/detect-xml-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          xmlSample,
          provider: selectedProvider 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to detect XML structure');
      }

      const result = await response.json();
      
      // Handle the new response format that includes data, model and provider
      const suggestions: ApiXPathSuggestion[] = result.data.mappings;
      const rootPath = result.data.itemRootPath || '';
      const modelUsed = result.model || 'Unknown';
      const providerUsed = result.provider || null;
      
      setUsedModel(modelUsed);
      setUsedProvider(providerUsed);

      // Convert API response to the format expected by the application
      const newMappings: XmlProfileFieldMapping[] = suggestions.map((suggestion: ApiXPathSuggestion) => ({
        id: generateUUID(),
        sourcePath: suggestion.xpath,
        header: suggestion.fieldName,
        isDynamicAttributeMapping: false,
      }));

      setDetectedRootPath(rootPath);
      setDetectedMappings(newMappings);
      setIsDetectionComplete(true);

      toast({
        title: "XML Analysis Complete",
        description: `AI analysis complete. Found ${newMappings.length} potential fields.`,
      });

    } catch (err: any) {
      console.error("Error during AI XML structure detection:", err);
      const errorMessage = err.message || "An unknown error occurred during AI analysis.";
      setError(errorMessage);
      toast({
        title: "AI Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMappingChange = (index: number, field: keyof XmlProfileFieldMapping, value: any) => {
    setDetectedMappings(currentMappings =>
      currentMappings.map((mapping, i) =>
        i === index ? { ...mapping, [field]: value } : mapping
      )
    );
  };

  const handleApplyDetection = () => {
    if (!detectedRootPath || detectedMappings.length === 0) {
      toast({
        title: "Error",
        description: "No valid detection results to apply.",
        variant: "destructive"
      });
      return;
    }

    onDetectionComplete(detectedRootPath, detectedMappings);
    onClose();
    
    toast({
      title: "Detection Applied",
      description: "The detected XML structure has been applied to your profile."
    });
  };

  const handleReset = () => {
    setXmlSample('');
    setIsDetectionComplete(false);
    setDetectedRootPath('');
    setDetectedMappings([]);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" /> AI-Powered XML Structure Detection
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 py-2 flex-grow overflow-y-auto">
          <p className="text-sm text-muted-foreground mb-4">
            Paste a sample XML that represents a single product or item. 
            The AI will analyze the structure and suggest XPath mappings for your profile.
          </p>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-provider" className="text-sm font-medium">
                Choose AI Provider
              </Label>
              <RadioGroup
                value={selectedProvider}
                onValueChange={(value) => handleProviderChange(value as 'openrouter' | 'requesty')}
                className="flex items-center space-x-4 mb-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="openrouter" id="openrouter" />
                  <Label htmlFor="openrouter" className="text-sm">
                    OpenRouter (Free Models)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="requesty" id="requesty" />
                  <Label htmlFor="requesty" className="text-sm">
                    Requesty.ai (Paid Models)
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="xml-sample">XML Sample</Label>
              <Textarea 
                id="xml-sample"
                placeholder="Paste your XML sample here..."
                value={xmlSample}
                onChange={handleXmlSampleChange}
                className="min-h-[200px] font-mono text-sm"
                disabled={isAnalyzing || isDetectionComplete}
              />
            </div>
            
            {!isDetectionComplete && (
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={isAnalyzing || !xmlSample}
                >
                  Clear
                </Button>
                <Button 
                  onClick={handleDetectStructure}
                  disabled={isAnalyzing || !xmlSample}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Detect Structure
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {error && (
              <div className="bg-destructive/10 p-4 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Detection Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            )}
            
            {isDetectionComplete && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Detection Results</CardTitle>
                  <CardDescription>
                    Review and customize the detected XML structure before applying it to your profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="root-path">Item Root Path (XPath)</Label>
                    <Input 
                      id="root-path"
                      value={detectedRootPath}
                      onChange={(e) => setDetectedRootPath(e.target.value)}
                      className="font-mono"
                    />
                    {isDetectionComplete && (usedModel || usedProvider) && (
                      <p className="text-xs text-muted-foreground text-center">
                        Structure detected using {usedProvider && <span>provider: <span className="font-semibold">{usedProvider}</span></span>}
                        {usedProvider && usedModel && <span> | </span>}
                        {usedModel && <span>model: <span className="font-mono">{usedModel}</span></span>}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Detected Field Mappings</Label>
                    <ScrollArea className="h-[300px] border rounded-md p-4">
                      <div className="space-y-6">
                        {detectedMappings.map((mapping, index) => (
                          <div key={mapping.id} className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`source-path-${index}`} className="text-xs">Source Path (XPath)</Label>
                                <Input
                                  id={`source-path-${index}`}
                                  value={mapping.sourcePath}
                                  onChange={(e) => handleMappingChange(index, 'sourcePath', e.target.value)}
                                  className="font-mono text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`header-${index}`} className="text-xs">Column Header</Label>
                                <Input
                                  id={`header-${index}`}
                                  value={mapping.header}
                                  onChange={(e) => handleMappingChange(index, 'header', e.target.value)}
                                  className="text-sm"
                                  disabled={mapping.isDynamicAttributeMapping}
                                />
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`dynamic-mapping-${index}`}
                                checked={mapping.isDynamicAttributeMapping}
                                onCheckedChange={(checked) => handleMappingChange(index, 'isDynamicAttributeMapping', !!checked)}
                              />
                              <Label
                                htmlFor={`dynamic-mapping-${index}`}
                                className="text-xs font-normal text-muted-foreground"
                              >
                                Map as Dynamic Attributes (uses 'name' attr for header, text content for value)
                              </Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          {isDetectionComplete && (
            <Button onClick={handleApplyDetection}>
              <Check className="mr-2 h-4 w-4" /> Apply Detection
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
