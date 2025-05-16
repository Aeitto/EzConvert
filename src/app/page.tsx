
"use client"; // Add "use client" if not already present for useState/useEffect

import { useState, useEffect } from 'react'; // Import useState and useEffect
import { AppHeader } from '@/components/AppHeader';
import { FileUploadSection } from '@/components/ez-convert/FileUploadSection';
import { ProfileManagementSection } from '@/components/ez-convert/ProfileManagementSection';
import { DataPreviewSection } from '@/components/ez-convert/DataPreviewSection';
import { DownloadSection } from '@/components/ez-convert/DownloadSection';
import { Separator } from '@/components/ui/separator';

export default function EzConvertPage() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <FileUploadSection />
            <ProfileManagementSection />
          </div>
          
          <Separator className="my-8" />
          
          <DataPreviewSection />
          
          <Separator className="my-8" />
          
          <DownloadSection />
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        EzConvert &copy; {currentYear !== null ? currentYear : ''}
      </footer>
    </div>
  );
}
