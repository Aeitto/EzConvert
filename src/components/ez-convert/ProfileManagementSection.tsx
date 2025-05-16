
"use client";
import { useState } from 'react';
import { useEzConvert } from '@/contexts/EzConvertContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings2, PlusCircle, Edit3, Trash2, AlertTriangle } from 'lucide-react'; // Removed Sparkles
import { ProfileFormModal } from './ProfileFormModal';
// import { AutoDetectConfigModal } from './AutoDetectConfigModal'; // Removed
import type { XmlProfile } from '@/types/ezconvert';
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
    xmlProfiles, 
    selectedXmlProfileId, 
    setSelectedXmlProfileId, 
    deleteXmlProfile,
    // uploadedFile, // No longer needed here for auto-detect
  } = useEzConvert();
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  // const [isAutoDetectModalOpen, setIsAutoDetectModalOpen] = useState(false); // Removed
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

  // Removed handleAutoDetect and handleConfigDetected functions

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
          {/* Removed Auto-detect button */}
        </div>
      </CardContent>

      <ProfileFormModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={editingProfile}
      />
      {/* Removed AutoDetectConfigModal rendering */}
    </Card>
  );
}
