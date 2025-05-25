"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { XmlProfileFieldMapping } from '@/types/ezconvert';

interface XmlDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function XmlDebugger({ isOpen, onClose }: XmlDebuggerProps) {
  const { toast } = useToast();
  const [xmlSample, setXmlSample] = useState<string>('');
  const [xpathExpression, setXpathExpression] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleXmlSampleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setXmlSample(e.target.value);
    setResult('');
  };

  const handleXpathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setXpathExpression(e.target.value);
    setResult('');
  };

  const testXPath = () => {
    if (!xmlSample || !xpathExpression) {
      toast({
        title: "Error",
        description: "Please provide both XML sample and XPath expression.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setResult('');

    try {
      // Parse the XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlSample, "application/xml");
      
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error(`XML parsing error: ${parserError.textContent}`);
      }

      // Evaluate the XPath
      const resultNodes: Node[] = [];
      try {
        const xpathResult = xmlDoc.evaluate(
          xpathExpression, 
          xmlDoc.documentElement, 
          null, 
          XPathResult.ANY_TYPE, 
          null
        );

        let resultType = "Unknown";
        switch (xpathResult.resultType) {
          case XPathResult.NUMBER_TYPE:
            resultType = "Number";
            setResult(`Number result: ${xpathResult.numberValue}`);
            break;
          case XPathResult.STRING_TYPE:
            resultType = "String";
            setResult(`String result: ${xpathResult.stringValue}`);
            break;
          case XPathResult.BOOLEAN_TYPE:
            resultType = "Boolean";
            setResult(`Boolean result: ${xpathResult.booleanValue}`);
            break;
          case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
          case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
            resultType = "Node Iterator";
            let node = xpathResult.iterateNext();
            let nodeCount = 0;
            let resultText = "";
            
            while (node) {
              nodeCount++;
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                resultText += `\nElement #${nodeCount}: <${element.tagName}>`;
                
                // Check for CDATA sections
                let hasCDATA = false;
                for (let i = 0; i < element.childNodes.length; i++) {
                  if (element.childNodes[i].nodeType === Node.CDATA_SECTION_NODE) {
                    resultText += `\n  CDATA content: "${element.childNodes[i].textContent}"`;
                    hasCDATA = true;
                    break;
                  }
                }
                
                if (!hasCDATA && element.textContent) {
                  resultText += `\n  Text content: "${element.textContent.trim()}"`;
                }
                
                // Show attributes
                if (element.attributes.length > 0) {
                  resultText += "\n  Attributes:";
                  for (let i = 0; i < element.attributes.length; i++) {
                    resultText += `\n    ${element.attributes[i].name}="${element.attributes[i].value}"`;
                  }
                }
              } else if (node.nodeType === Node.ATTRIBUTE_NODE) {
                resultText += `\nAttribute #${nodeCount}: ${(node as Attr).name}="${(node as Attr).value}"`;
              } else if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                if (text) {
                  resultText += `\nText #${nodeCount}: "${text}"`;
                }
              } else {
                resultText += `\nNode #${nodeCount}: Type ${node.nodeType}`;
              }
              
              node = xpathResult.iterateNext();
            }
            
            setResult(`Found ${nodeCount} nodes of type: ${resultType}${resultText}`);
            break;
          case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
          case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
            resultType = "Node Snapshot";
            setResult(`Node Snapshot with ${xpathResult.snapshotLength} nodes`);
            break;
          case XPathResult.ANY_UNORDERED_NODE_TYPE:
          case XPathResult.FIRST_ORDERED_NODE_TYPE:
            resultType = "Single Node";
            const singleNode = xpathResult.singleNodeValue;
            if (singleNode) {
              if (singleNode.nodeType === Node.ELEMENT_NODE) {
                const element = singleNode as Element;
                let resultText = `Element: <${element.tagName}>`;
                
                // Check for CDATA sections
                let hasCDATA = false;
                for (let i = 0; i < element.childNodes.length; i++) {
                  if (element.childNodes[i].nodeType === Node.CDATA_SECTION_NODE) {
                    resultText += `\nCDATA content: "${element.childNodes[i].textContent}"`;
                    hasCDATA = true;
                    break;
                  }
                }
                
                if (!hasCDATA && element.textContent) {
                  resultText += `\nText content: "${element.textContent.trim()}"`;
                }
                
                // Show attributes
                if (element.attributes.length > 0) {
                  resultText += "\nAttributes:";
                  for (let i = 0; i < element.attributes.length; i++) {
                    resultText += `\n  ${element.attributes[i].name}="${element.attributes[i].value}"`;
                  }
                }
                
                setResult(resultText);
              } else if (singleNode.nodeType === Node.ATTRIBUTE_NODE) {
                setResult(`Attribute: ${(singleNode as Attr).name}="${(singleNode as Attr).value}"`);
              } else if (singleNode.nodeType === Node.TEXT_NODE) {
                setResult(`Text: "${singleNode.textContent?.trim()}"`);
              } else {
                setResult(`Node of type: ${singleNode.nodeType}`);
              }
            } else {
              setResult("No node found");
            }
            break;
        }

      } catch (xpathError: any) {
        throw new Error(`XPath evaluation error: ${xpathError.message}`);
      }

    } catch (error: any) {
      console.error("Error testing XPath:", error);
      setResult(`Error: ${error.message}`);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>XML XPath Debugger</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="xml-sample">XML Sample</Label>
              <Textarea 
                id="xml-sample" 
                className="h-[300px] font-mono text-sm"
                placeholder="Paste your XML sample here..."
                value={xmlSample}
                onChange={handleXmlSampleChange}
              />
            </div>
            
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="xpath">XPath Expression</Label>
              <Input
                id="xpath"
                className="font-mono"
                placeholder="Enter XPath expression..."
                value={xpathExpression}
                onChange={handleXpathChange}
              />
              
              <Button 
                onClick={testXPath}
                disabled={isProcessing || !xmlSample || !xpathExpression}
                className="mt-2"
              >
                Test XPath
              </Button>
              
              <Label className="mt-4">Result</Label>
              <ScrollArea className="flex-1 border rounded-md p-4 h-[240px]">
                <pre className="whitespace-pre-wrap text-sm">
                  {result || "Results will appear here..."}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
