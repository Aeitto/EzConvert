"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Save, X, AlertCircle, Check, Loader2, Info, ListTree, Key, FileJson } from 'lucide-react';
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
  description?: string;
  isDynamicKeyValuePair?: boolean;
}

interface AiDynamicBlockKeySource {
  from: 'attribute' | 'childElementText' | 'repeatingElementText';
  identifier: string;
}

interface AiDynamicBlockValueSource {
  from: 'attribute' | 'childElementText' | 'repeatingElementText';
  identifier?: string;
}

interface AiDynamicBlockDefinition {
  repeatingElementXPath: string;
  keySource: AiDynamicBlockKeySource;
  valueSource: AiDynamicBlockValueSource;
  description?: string;
  exampleMappings?: ApiXPathSuggestion[];
}

interface AiApiResponse {
  itemRootPath?: string;
  suggestedMappings?: ApiXPathSuggestion[];
  dynamicBlockMapping?: AiDynamicBlockDefinition;
  promptModeUsed: 'detailedFields' | 'dynamicBlock';
  error?: string;
  rawAiResponse?: string;
  model?: string;
  provider?: string;
}

export function XmlAiDetectionModal({ 
  isOpen, 
  onClose, 
  onDetectionComplete 
}: XmlAiDetectionModalProps) {
  const { toast } = useToast();
  const [xmlSample, setXmlSample] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [detectedMappings, setDetectedMappings] = useState<ApiXPathSuggestion[]>([]);
  const [currentDynamicBlock, setCurrentDynamicBlock] = useState<AiDynamicBlockDefinition | null>(null);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, boolean>>({});
  const [itemRootPath, setItemRootPath] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [usedProvider, setUsedProvider] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'openrouter' | 'requesty'>('openrouter');
  const [detectionMode, setDetectionMode] = useState<'detailedFields' | 'dynamicBlock'>('detailedFields');

  const isDetectionComplete = (detectionMode === 'detailedFields' && detectedMappings.length > 0) || 
                            (detectionMode === 'dynamicBlock' && (detectedMappings.length > 0 || currentDynamicBlock !== null)) ||
                            error !== null;

  useEffect(() => {
    setDetectedMappings([]);
    setCurrentDynamicBlock(null);
    setError(null);
    setUsedModel(null);
    setUsedProvider(null);
    setSelectedMappings({});
  }, [detectionMode]);

  const handleXmlSampleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setXmlSample(e.target.value);
    if (detectedMappings.length > 0 || currentDynamicBlock || error) {
      setDetectedMappings([]);
      setCurrentDynamicBlock(null);
      setError(null);
      setUsedModel(null);
      setUsedProvider(null);
      setSelectedMappings({});
    }
  };

  const handleAnalyzeXml = async () => {
    if (xmlSample.length < 50) {
      toast({
        variant: 'destructive',
        title: 'XML Sample Too Short',
        description: 'Please provide an XML sample of at least 50 characters.',
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setDetectedMappings([]);
    setCurrentDynamicBlock(null);
    setUsedModel(null);
    setUsedProvider(null);
    setSelectedMappings({});

    try {
      const response = await fetch('/api/detect-xml-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xmlSample,
          apiProvider: selectedProvider === 'requesty' ? 'requesty.ai' : 'openrouter.ai',
          detectionMode,
        }),
      });

      const data: AiApiResponse = await response.json();

      if (!response.ok) {
        setError(data.error || `API request failed with status ${response.status}`);
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: data.error || `API request failed. Raw: ${data.rawAiResponse?.substring(0,100)}`,
        });
        setIsAnalyzing(false);
        return;
      }

      if (data.error) {
        setError(data.error);
        toast({
          variant: 'destructive',
          title: 'Analysis Error',
          description: data.error,
        });
      } else {
        setUsedModel(data.model || 'N/A');
        setUsedProvider(data.provider || selectedProvider);

        let finalMappings: ApiXPathSuggestion[] = [];

        // Always populate finalMappings (for the main table) from suggestedMappings if available
        if (data.suggestedMappings && data.suggestedMappings.length > 0) {
          finalMappings = data.suggestedMappings;
        }

        // Handle dynamic block specific data
        if (data.promptModeUsed === 'dynamicBlock' && data.dynamicBlockMapping) {
          setCurrentDynamicBlock(data.dynamicBlockMapping);
          // The 'exampleMappings' from dynamicBlockMapping are displayed in their own section,
          // not in the main 'detectedMappings' table.
        } else {
          // If not in dynamicBlock mode or no dynamicBlockMapping, ensure it's cleared.
          setCurrentDynamicBlock(null);
        }
        
        setDetectedMappings(finalMappings);
        setItemRootPath(data.itemRootPath || '');
        toast({
          title: 'Analysis Complete',
          description: `XML structure analyzed using ${data.promptModeUsed} mode. Review the suggestions.`,
        });
      }
    } catch (err) {
      console.error('Analysis API call error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: `An error occurred: ${errorMessage}`,
      });
    }
    setIsAnalyzing(false);
  };

  const handleMappingChange = (index: number, field: keyof ApiXPathSuggestion, value: any) => {
    setDetectedMappings(currentMappings =>
      currentMappings.map((mapping, i) =>
        i === index ? { ...mapping, [field]: value } : mapping
      )
    );
  };

  const handleToggleSelect = (key: string, isSelected: boolean) => {
    setSelectedMappings(currentSelected => ({ ...currentSelected, [key]: isSelected }));
  };

  const handleToggleSelectAll = (select: boolean) => {
    const newSelectedMappings: Record<string, boolean> = {};
    detectedMappings.forEach(mapping => {
      newSelectedMappings[`${mapping.fieldName}_${mapping.xpath}`] = select;
    });
    setSelectedMappings(newSelectedMappings);
  };

  const handleApplyDetection = () => {
    const mappingsToApply: XmlProfileFieldMapping[] = Object.entries(selectedMappings)
      .filter(([,isSelected]) => isSelected)
      .map(([key]) => {
        // Reconstruct the original mapping object from the key or find it in detectedMappings
        // This assumes key is `fieldName_xpath`
        const parts = key.split('_');
        const fieldName = parts.slice(0, -1).join('_'); // handle fieldNames that might have underscores
        const xpath = parts.slice(-1)[0];
        const originalMapping = detectedMappings.find(m => m.fieldName === fieldName && m.xpath === xpath);
        if (!originalMapping) return null; // Should not happen if keys are managed correctly

        return {
          id: generateUUID(),
          sourcePath: originalMapping.xpath,
          header: originalMapping.fieldName,
          description: originalMapping.description || '',
          valueType: 'string', // Default or determine from XML/AI later
          transformations: [],
          isDynamicAttributeMapping: originalMapping.isDynamicKeyValuePair || false,
        };
      })
      .filter(Boolean) as XmlProfileFieldMapping[];

    if (mappingsToApply.length === 0 && !currentDynamicBlock) { 
      toast({
        title: "No Mappings Selected",
        description: "Please select at least one mapping to apply, or a dynamic block if applicable.",
        variant: "destructive",
      });
      return;
    }

    // Pass itemRootPath and the selected/generated mappings
    // If currentDynamicBlock is meant to be translated into mappings here, that logic needs to be added.
    // For now, it's just passing the selected suggestedMappings.
    onDetectionComplete(itemRootPath, mappingsToApply);
    onClose();
  };

  const handleReset = () => {
    setXmlSample('');
    setDetectedMappings([]);
    setCurrentDynamicBlock(null);
    setError(null);
    setUsedModel(null);
    setUsedProvider(null);
    setSelectedMappings({});
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
              <Label htmlFor="api-provider" className="text-sm font-medium mb-1 block">API Provider</Label>
              <RadioGroup
                id="api-provider"
                value={selectedProvider}
                onValueChange={(value: 'openrouter' | 'requesty') => setSelectedProvider(value)}
                className="flex space-x-2"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="openrouter" id="openrouter" />
                  <Label htmlFor="openrouter" className="font-normal text-sm">OpenRouter (Free/Flexible)</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="requesty" id="requesty" />
                  <Label htmlFor="requesty" className="font-normal text-sm">Requesty.ai (Optimized)</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="detection-mode" className="text-sm font-medium mb-1 block">Detection Mode</Label>
              <RadioGroup
                id="detection-mode"
                value={detectionMode}
                onValueChange={(value: 'detailedFields' | 'dynamicBlock') => setDetectionMode(value as 'detailedFields' | 'dynamicBlock')}
                className="flex space-x-2"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="detailedFields" id="detailed-mode" />
                  <Label htmlFor="detailed-mode" className="font-normal text-sm">Detailed Fields</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="dynamicBlock" id="dynamic-block-mode" />
                  <Label htmlFor="dynamic-block-mode" className="font-normal text-sm">Dynamic Blocks</Label>
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
                  onClick={handleAnalyzeXml}
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
                      Analyze XML Sample
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
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      Detected Item Root Path: <code className="bg-muted px-1 py-0.5 rounded text-xs">{itemRootPath || 'N/A'}</code>
                    </p>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {detectedMappings.map((mapping, index) => (
                        <div key={index} className="p-3 border rounded-md bg-background/70 space-y-2">
                          <div className="grid grid-cols-2 gap-x-4 items-start">
                            <div className="space-y-1">
                              <Label htmlFor={`source-path-${index}`} className="text-xs">Source Path (XPath)</Label>
                              <Input
                                id={`source-path-${index}`}
                                value={mapping.xpath}
                                onChange={(e) => handleMappingChange(index, 'xpath', e.target.value)}
                                className="font-mono text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`header-${index}`} className="text-xs">Column Header</Label>
                              <Input
                                id={`header-${index}`}
                                value={mapping.fieldName}
                                onChange={(e) => handleMappingChange(index, 'fieldName', e.target.value)}
                                className="text-sm"
                                disabled={mapping.isDynamicKeyValuePair}
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`dynamic-mapping-${index}`}
                              checked={mapping.isDynamicKeyValuePair}
                              onCheckedChange={(checkedState) => handleMappingChange(index, 'isDynamicKeyValuePair', checkedState === true)}
                            />
                            <Label
                              htmlFor={`dynamic-mapping-${index}`}
                              className="text-xs font-normal text-muted-foreground"
                            >
                              Map as Dynamic Attributes (uses 'name' attr for header, text content for value)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`select-mapping-${index}`}
                              checked={selectedMappings[`${mapping.fieldName}_${mapping.xpath}`] || false}
                              onCheckedChange={(checkedState) => handleToggleSelect(`${mapping.fieldName}_${mapping.xpath}`, checkedState === true)}
                            />
                            <Label
                              htmlFor={`select-mapping-${index}`}
                              className="text-xs font-normal text-muted-foreground"
                            >
                              Select for Application
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {isDetectionComplete && detectionMode === 'dynamicBlock' && currentDynamicBlock && !error && (
              <Card className="mt-4 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <ListTree className="mr-2 h-5 w-5 text-primary" /> Detected Dynamic Attribute Block Definition
                  </CardTitle>
                  <CardDescription>
                    The AI has identified the following pattern for dynamic key-value attributes. 
                    You can apply this pattern to your profile. Example mappings below are for illustration.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2 p-3 border rounded-md bg-background/80">
                    <p>
                      <strong className="font-medium">Repeating Element XPath:</strong>
                      <br />
                      <code className="bg-muted px-2 py-1 rounded text-xs block mt-1">{currentDynamicBlock.repeatingElementXPath}</code>
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="p-2 border-l-2 border-blue-500 bg-blue-500/10 rounded-r-md">
                        <p className="flex items-center font-semibold"><Key className="mr-2 h-4 w-4 text-blue-700" />Key Source:</p>
                        <p className="ml-1 mt-1 text-xs">From: <code className="bg-muted px-1 py-0.5 rounded">{currentDynamicBlock.keySource.from}</code></p>
                        {currentDynamicBlock.keySource.identifier && 
                          <p className="ml-1 text-xs">Identifier: <code className="bg-muted px-1 py-0.5 rounded">{currentDynamicBlock.keySource.identifier}</code></p>}
                      </div>
                      <div className="p-2 border-l-2 border-green-500 bg-green-500/10 rounded-r-md">
                        <p className="flex items-center font-semibold"><FileJson className="mr-2 h-4 w-4 text-green-700" />Value Source:</p>
                        <p className="ml-1 mt-1 text-xs">From: <code className="bg-muted px-1 py-0.5 rounded">{currentDynamicBlock.valueSource.from}</code></p>
                        {currentDynamicBlock.valueSource.identifier && 
                          <p className="ml-1 text-xs">Identifier: <code className="bg-muted px-1 py-0.5 rounded">{currentDynamicBlock.valueSource.identifier}</code></p>}
                      </div>
                    </div>
                    {currentDynamicBlock.description && 
                      <p className="mt-2 text-xs text-muted-foreground italic">Note: {currentDynamicBlock.description}</p>}
                  </div>

                  {currentDynamicBlock.exampleMappings && currentDynamicBlock.exampleMappings.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1">Example Mappings (Illustrative):</h5>
                      <ScrollArea className="h-[100px] border rounded-md p-2 bg-background/50">
                        <div className="space-y-1">
                          {currentDynamicBlock.exampleMappings.map((exMap, idx) => (
                            <div key={idx} className="text-xs p-1 rounded bg-muted/50">
                              <span className="font-medium">{exMap.fieldName}:</span> <code className="text-blue-600">{exMap.xpath}</code>
                              {exMap.isDynamicKeyValuePair && <Check className="inline ml-1 h-3 w-3 text-green-600" />}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isDetectionComplete && detectionMode === 'dynamicBlock' && !currentDynamicBlock && !error && (
              <Card className="mt-4 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Info className="mr-2 h-5 w-5 text-primary" /> No Dynamic Blocks Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The AI did not identify any dynamic attribute blocks in the provided XML sample using the current mode.
                    You can try the "Detailed Fields" mode or adjust your XML sample.
                  </p>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
        
        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          {isDetectionComplete && !error && (detectedMappings.length > 0 || currentDynamicBlock !== null) && (
            <Button onClick={handleApplyDetection}>
              <Check className="mr-2 h-4 w-4" /> Apply Detection
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
