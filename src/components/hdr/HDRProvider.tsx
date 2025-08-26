'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useHDR, applyHDRStyles, type HDRCapabilities } from '@/hooks/use-hdr';

interface HDRContextType {
  capabilities: HDRCapabilities;
  isHDRSupported: boolean;
  getHDRClass: (gameType: 'uno' | 'snake' | 'chess') => string;
}

const HDRContext = createContext<HDRContextType | undefined>(undefined);

export function HDRProvider({ children }: { children: ReactNode }) {
  const capabilities = useHDR();
  const isHDRSupported = capabilities.supportsP3 || capabilities.supportsRec2020;

  useEffect(() => {
    // Apply HDR styles to the document
    applyHDRStyles(capabilities);
  }, [capabilities]);

  const getHDRClass = (gameType: 'uno' | 'snake' | 'chess'): string => {
    if (!isHDRSupported) return '';
    
    const baseClasses = 'hdr-accelerated';
    
    switch (gameType) {
      case 'uno':
        return `${baseClasses} hdr-uno`;
      case 'snake':
        return `${baseClasses} hdr-snake`;
      case 'chess':
        return `${baseClasses} hdr-chess`;
      default:
        return baseClasses;
    }
  };

  const contextValue: HDRContextType = {
    capabilities,
    isHDRSupported,
    getHDRClass,
  };

  return (
    <HDRContext.Provider value={contextValue}>
      {children}
    </HDRContext.Provider>
  );
}

export function useHDRContext(): HDRContextType {
  const context = useContext(HDRContext);
  if (context === undefined) {
    throw new Error('useHDRContext must be used within an HDRProvider');
  }
  return context;
}

// Optional: Export a hook that safely returns HDR context or defaults
export function useOptionalHDR(): HDRContextType | null {
  return useContext(HDRContext) || null;
}