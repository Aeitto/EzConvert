import { EzConvertLogo } from '@/components/EzConvertLogo';

export function AppHeader() {
  return (
    <header className="py-4 px-6 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
      <div className="container mx-auto flex items-center gap-3">
        <EzConvertLogo />
        <h1 className="text-2xl font-semibold text-primary">EzConvert</h1>
      </div>
    </header>
  );
}
