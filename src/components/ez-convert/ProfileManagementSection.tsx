
"use client";
import { useState } from 'react';
import { useEzConvert } from '@/contexts/EzConvertContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings2, PlusCircle, Edit3, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { ProfileFormModal } from './ProfileFormModal';
import { XmlAiDetectionModal } from './XmlAiDetectionModal';
import type { XmlProfile, XmlProfileFieldMapping } from '@/types/ezconvert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
// import type { AutoDetectXmlConfigOutput } from '@/ai/flows/auto-detect-xml-config'; // Removed


export function ProfileManagementSection() {
  const { 
    fileType, 
    setFileType,
    xmlProfiles, 
    selectedXmlProfileId, 
    setSelectedXmlProfileId, 
    deleteXmlProfile,
    // uploadedFile, // No longer needed here for auto-detect
  } = useEzConvert();
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAiDetectionModalOpen, setIsAiDetectionModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<XmlProfile | null>(null);
  const { toast } = useToast();

  const handleAddNewProfile = () => {
    setEditingProfile(null);
    setIsProfileModalOpen(true);
  };

  const handleEditProfile = (profileId: string) => {
    const profileToEdit = xmlProfiles.find(p => p.id === profileId);
    if (profileToEdit) {
      setEditingProfile(profileToEdit);
      setIsProfileModalOpen(true);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    deleteXmlProfile(profileId);
    toast({ title: "Profile Deleted", description: "The XML profile has been deleted." });
  };

  const handleOpenAiDetection = () => {
    // Ensure file type is set to 'xml' when using AI detection
    setFileType('xml');
    setIsAiDetectionModalOpen(true);
  };

  const handleDetectionComplete = (rootPath: string, fieldMappings: XmlProfileFieldMapping[]) => {
    // Create a new profile with the detected structure
    setEditingProfile({
      id: '',
      name: 'AI Detected Profile',
      itemRootPath: rootPath,
      fieldMappings,
      createdAt: new Date().toISOString()
    });
    
    // Open the profile form to let the user customize and save the profile
    setIsProfileModalOpen(true);
    
    toast({ 
      title: "AI Detection Complete", 
      description: `Successfully detected ${fieldMappings.length} field mappings. Please review and save the profile.` 
    });
  };

  if (fileType !== 'xml') {
    return null; 
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Settings2 className="text-primary" /> XML Profile Management
        </CardTitle>
        <CardDescription>Manage configurations for parsing different XML structures.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="xml-profile-select" className="block text-sm font-medium mb-1">Select Profile</label>
          <div className="flex gap-2">
            <Select onValueChange={setSelectedXmlProfileId} value={selectedXmlProfileId || undefined} disabled={xmlProfiles.length === 0}>
              <SelectTrigger id="xml-profile-select" className="flex-grow">
                <SelectValue placeholder="Select an XML profile..." />
              </SelectTrigger>
              <SelectContent>
                {xmlProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedXmlProfileId && (
              <>
                <Button variant="outline" size="icon" onClick={() => handleEditProfile(selectedXmlProfileId)} aria-label="Edit selected profile">
                  <Edit3 size={16} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" aria-label="Delete selected profile">
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the profile
                        "{xmlProfiles.find(p => p.id === selectedXmlProfileId)?.name}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteProfile(selectedXmlProfileId)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
          {xmlProfiles.length === 0 && (
             <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                <AlertTriangle size={14} /> No XML profiles found. Please create one.
             </p>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleAddNewProfile} variant="outline" className="w-full">
            <PlusCircle size={16} className="mr-2" /> Create New Profile
          </Button>
          <Button onClick={handleOpenAiDetection} variant="outline" className="w-full">
            <Sparkles size={16} className="mr-2" /> AI Detect Structure
          </Button>
        </div>
      </CardContent>

      <ProfileFormModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={editingProfile}
      />
      
      <XmlAiDetectionModal
        isOpen={isAiDetectionModalOpen}
        onClose={() => setIsAiDetectionModalOpen(false)}
        onDetectionComplete={handleDetectionComplete}
      />
    </Card>
  );
}
