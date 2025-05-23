import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { EzConvertProvider } from '@/contexts/EzConvertContext';
import { ClientOnly } from '@/components/ClientOnly'; // Import ClientOnly

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EzConvert',
  description: 'Convert CSV and XML product data with ease. AI-powered mapping and profiles.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <EzConvertProvider>
          <ClientOnly> {/* Wrap the main content and Toaster */}
            {children}
            <Toaster />
          </ClientOnly>
        </EzConvertProvider>
      </body>
    </html>
  );
}
