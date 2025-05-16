
"use client";
import { useState, useEffect, type FormEvent, useId } from 'react';
import { useEzConvert } from '@/contexts/EzConvertContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { XmlProfile, XmlProfileFieldMapping } from '@/types/ezconvert';
import { PlusCircle, Trash2, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox

interface ProfileFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: XmlProfile | null;
}

const initialFieldMapping: Omit<XmlProfileFieldMapping, 'id'> = { 
  sourcePath: '', 
  header: '',
  isDynamicAttributeMapping: false,
};

export function ProfileFormModal({ isOpen, onClose, profile }: ProfileFormModalProps) {
  const { addXmlProfile, updateXmlProfile, suggestedColumnHeaders } = useEzConvert();
  const [name, setName] = useState('');
  const [itemRootPath, setItemRootPath] = useState('');
  const [fieldMappings, setFieldMappings] = useState<XmlProfileFieldMapping[]>([
    { ...initialFieldMapping, id: crypto.randomUUID(), header: suggestedColumnHeaders[0] || 'Header1' }
  ]);
  const { toast } = useToast();
  const baseFormId = useId(); // Use useId for unique form ID

  useEffect(() => {
    if (isOpen) {
      if (profile) {
        setName(profile.name);
        setItemRootPath(profile.itemRootPath);
        setFieldMappings(profile.fieldMappings.length > 0 
          ? profile.fieldMappings.map(fm => ({
              ...fm, 
              id: fm.id || crypto.randomUUID(),
              isDynamicAttributeMapping: fm.isDynamicAttributeMapping || false,
            })) 
          : [{ ...initialFieldMapping, id: crypto.randomUUID(), header: suggestedColumnHeaders[0] || 'Header1' }]);
      } else {
        setName('');
        setItemRootPath('');
        setFieldMappings([{ ...initialFieldMapping, id: crypto.randomUUID(), header: suggestedColumnHeaders[0] || 'Header1' }]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isOpen, suggestedColumnHeaders]); // Added suggestedColumnHeaders to dependencies

  const handleMappingChange = (index: number, field: keyof XmlProfileFieldMapping, value: string | boolean) => {
    setFieldMappings(currentMappings =>
      currentMappings.map((mapping, i) =>
        i === index ? { ...mapping, [field]: value } : mapping
      )
    );
  };

  const addMappingField = () => {
    setFieldMappings(prevMappings => [
      ...prevMappings,
      { ...initialFieldMapping, id: crypto.randomUUID(), header: `Header${prevMappings.length + 1}` }
    ]);
  };

  const removeMappingField = (index: number) => {
    if (fieldMappings.length === 1) { 
        toast({ title: "Cannot Remove", description: "At least one field mapping is required.", variant: "destructive"});
        return;
    }
    setFieldMappings(currentMappings => currentMappings.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !itemRootPath.trim()) {
      toast({ title: "Validation Error", description: "Profile Name and Item Root Path are required.", variant: "destructive" });
      return;
    }
    if (fieldMappings.some(fm => !fm.sourcePath.trim() || (!fm.isDynamicAttributeMapping && !fm.header.trim()) )) {
      toast({ title: "Validation Error", description: "All regular field mappings must have a Source Path and a Header name. Dynamic mappings only need Source Path.", variant: "destructive" });
      return;
    }

    const newProfileData: Omit<XmlProfile, 'id' | 'createdAt'> = {
      name,
      itemRootPath,
      fieldMappings: fieldMappings.map(fm => ({
        ...fm, 
        id: fm.id || crypto.randomUUID(),
        isDynamicAttributeMapping: fm.isDynamicAttributeMapping || false,
        // If dynamic and header is empty, ensure it's an empty string not undefined
        header: fm.header || '', 
      })),
    };

    if (profile) {
      updateXmlProfile({ ...profile, ...newProfileData });
      toast({ title: "Profile Updated", description: `Profile "${name}" has been updated.` });
    } else {
      addXmlProfile({ ...newProfileData, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
      toast({ title: "Profile Created", description: `Profile "${name}" has been created.` });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle>{profile ? 'Edit' : 'Create'} XML Profile</DialogTitle>
        </DialogHeader>
        
        <form id={baseFormId} onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0 overflow-y-auto px-6 space-y-4"> {/* Added overflow-y-auto */}
          <div className="space-y-1 flex-shrink-0">
            <Label htmlFor={`${baseFormId}-profile-name`}>Profile Name</Label>
            <Input id={`${baseFormId}-profile-name`} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          
          <div className="space-y-1 flex-shrink-0">
            <Label htmlFor={`${baseFormId}-item-root-path`}>Item Root Path (XPath)</Label>
            <Input 
              id={`${baseFormId}-item-root-path`}
              value={itemRootPath} 
              onChange={(e) => setItemRootPath(e.target.value)} 
              placeholder="e.g., /catalog/product or //channel/item" 
              required 
            />
            <p className="text-xs text-muted-foreground mt-1">XPath to the repeating XML element that represents a single product/item.</p>
          </div>

          {/* Field Mappings Section */}
          <div className="space-y-2 flex flex-col flex-grow min-h-0">
            <div>
              <Label htmlFor={`${baseFormId}-field-mappings-scroll-area`}>Field Mappings</Label>
              <p className="text-xs text-muted-foreground">
                Map XML tags/paths/attributes to desired column headers.
                For dynamic attributes (e.g. from &lt;a name="Attr"&gt;Value&lt;/a&gt;), check "Dynamic" and set Source Path to point to the 'a' tags (e.g. 'attrs/a').
                The 'Header' field can be an optional prefix for dynamic headers.
              </p>
            </div>
            
            <ScrollArea
              id={`${baseFormId}-field-mappings-scroll-area`}
              className="rounded-md border p-3 h-[180px] " 
            >
              <div className="space-y-4">
                {fieldMappings.map((mapping, index) => (
                  <div key={mapping.id || index} className="space-y-2 p-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="XML Tag/Path (e.g. name, details/price, attrs/a)"
                        value={mapping.sourcePath}
                        onChange={(e) => handleMappingChange(index, 'sourcePath', e.target.value)}
                        className="flex-grow"
                        required
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMappingField(index)} disabled={fieldMappings.length <= 1} aria-label="Remove mapping">
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                       <Input
                        placeholder="Desired Header (or Prefix for dynamic)"
                        value={mapping.header}
                        onChange={(e) => handleMappingChange(index, 'header', e.target.value)}
                        className="flex-grow"
                        disabled={mapping.isDynamicAttributeMapping && !mapping.header} // Can still be a prefix
                        required={!mapping.isDynamicAttributeMapping}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${baseFormId}-dynamic-mapping-${index}`}
                        checked={mapping.isDynamicAttributeMapping}
                        onCheckedChange={(checked) => handleMappingChange(index, 'isDynamicAttributeMapping', !!checked)}
                      />
                      <Label
                        htmlFor={`${baseFormId}-dynamic-mapping-${index}`}
                        className="text-sm font-normal text-muted-foreground"
                      >
                        Map as Dynamic Attributes (uses 'name' attr for header, text content for value)
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={addMappingField} 
              className="w-full mt-3 flex-shrink-0" 
            >
              <PlusCircle size={16} className="mr-2" /> Add Mapping
            </Button>
          </div>
        </form>
        
        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0"> {/* Removed mt-auto */}
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" form={baseFormId} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save size={16} className="mr-2"/> {profile ? 'Save Changes' : 'Create Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
