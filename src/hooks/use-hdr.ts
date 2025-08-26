import { useEffect, useState } from 'react';

interface HDRCapabilities {
  supportsP3: boolean;
  supportsRec2020: boolean;
  supportsHighDynamicRange: boolean;
  colorGamut: 'srgb' | 'p3' | 'rec2020';
}

export function useHDR(): HDRCapabilities {
  const [capabilities, setCapabilities] = useState<HDRCapabilities>({
    supportsP3: false,
    supportsRec2020: false,
    supportsHighDynamicRange: false,
    colorGamut: 'srgb',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkHDRSupport = () => {
      // Check for P3 color gamut support
      const supportsP3 = window.matchMedia('(color-gamut: p3)').matches;
      
      // Check for Rec2020 color gamut support
      const supportsRec2020 = window.matchMedia('(color-gamut: rec2020)').matches;
      
      // Check for high dynamic range support
      const supportsHighDynamicRange = window.matchMedia('(dynamic-range: high)').matches;
      
      // Determine the best available color gamut
      let colorGamut: 'srgb' | 'p3' | 'rec2020' = 'srgb';
      if (supportsRec2020) {
        colorGamut = 'rec2020';
      } else if (supportsP3) {
        colorGamut = 'p3';
      }

      setCapabilities({
        supportsP3,
        supportsRec2020,
        supportsHighDynamicRange,
        colorGamut,
      });
    };

    // Initial check
    checkHDRSupport();

    // Listen for changes in color gamut support
    const p3MediaQuery = window.matchMedia('(color-gamut: p3)');
    const rec2020MediaQuery = window.matchMedia('(color-gamut: rec2020)');
    const hdrMediaQuery = window.matchMedia('(dynamic-range: high)');

    const handleChange = () => checkHDRSupport();

    p3MediaQuery.addEventListener('change', handleChange);
    rec2020MediaQuery.addEventListener('change', handleChange);
    hdrMediaQuery.addEventListener('change', handleChange);

    return () => {
      p3MediaQuery.removeEventListener('change', handleChange);
      rec2020MediaQuery.removeEventListener('change', handleChange);
      hdrMediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return capabilities;
}

// Utility function to get HDR-enhanced class names
export function getHDRClassName(baseClass: string, hdrClass: string, capabilities: HDRCapabilities): string {
  if (capabilities.supportsP3 || capabilities.supportsRec2020) {
    return `${baseClass} ${hdrClass}`;
  }
  return baseClass;
}

// Utility function to apply HDR styles conditionally
export function applyHDRStyles(capabilities: HDRCapabilities) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  if (capabilities.supportsP3) {
    root.classList.add('hdr-p3-supported');
  }
  
  if (capabilities.supportsRec2020) {
    root.classList.add('hdr-rec2020-supported');
  }
  
  if (capabilities.supportsHighDynamicRange) {
    root.classList.add('hdr-dynamic-range-supported');
  }
  
  root.setAttribute('data-color-gamut', capabilities.colorGamut);
}