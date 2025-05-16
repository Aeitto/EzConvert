
"use client";

import type { ReactNode} from 'react';
import { useState, useEffect } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode; // Optional fallback content, defaults to null
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // Render nothing (or the fallback) on the server and during initial client-side render
    return <>{fallback}</>;
  }

  // Render children only on the client after mount
  return <>{children}</>;
}
