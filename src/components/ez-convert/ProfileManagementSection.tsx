"use client";
import { useState } from 'react';
import { useEzConvert } from '@/contexts/EzConvertContext';
import { XmlDebugger } from './XmlDebugger';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings2, PlusCircle, Edit3, Trash2, AlertTriangle, Bug } from 'lucide-react';
import { ProfileFormModal } from './ProfileFormModal';
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

export function ProfileManagementSection() {
  const [isDebuggerOpen, setIsDebuggerOpen] = useState<boolean>(false);
  const { 
    fileType, 
    setFileType,
    xmlProfiles, 
    selectedXmlProfileId, 
    setSelectedXmlProfileId, 
    deleteXmlProfile,
  } = useEzConvert();
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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

  if (fileType !== 'xml') {
    return null; 
  }

  return (
    <>
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
        
        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={handleAddNewProfile}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <PlusCircle size={16} className="mr-2" /> Create New Profile
          </Button>
          <Button
            onClick={() => setIsDebuggerOpen(true)}
            variant="outline"
            className="w-full"
          >
            <Bug size={16} className="mr-2" /> XML XPath Debugger
          </Button>
        </div>
      </CardContent>

      <ProfileFormModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={editingProfile}
      />
    </Card>
      <XmlDebugger 
        isOpen={isDebuggerOpen}
        onClose={() => setIsDebuggerOpen(false)}
      />
    </>
  );
}
