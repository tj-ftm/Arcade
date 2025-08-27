"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileRotateButtonProps {
  onRotate?: () => void;
  className?: string;
}

export const MobileRotateButton = ({ onRotate, className = '' }: MobileRotateButtonProps) => {
  const [isRotated, setIsRotated] = useState(false);
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const handleRotate = () => {
    const newRotation = !isRotated;
    setIsRotated(newRotation);
    
    // Apply rotation to the game container
    const gameContainer = document.querySelector('[data-game-container]');
    if (gameContainer) {
      if (newRotation) {
        gameContainer.classList.add('rotate-90', 'scale-75');
        // Lock orientation to landscape
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {
            // Fallback for browsers that don't support orientation lock
            console.log('Orientation lock not supported');
          });
        }
      } else {
        gameContainer.classList.remove('rotate-90', 'scale-75');
        // Unlock orientation
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      }
    }
    
    onRotate?.();
  };

  return (
    <Button
      onClick={handleRotate}
      variant="outline"
      size="sm"
      className={`fixed bottom-4 right-4 z-50 bg-black/60 border-white/30 text-white hover:bg-white/20 transition-all duration-300 ${className}`}
      title={isRotated ? 'Rotate to Portrait' : 'Rotate to Landscape'}
    >
      <RotateCcw className={`h-4 w-4 transition-transform duration-300 ${isRotated ? 'rotate-90' : ''}`} />
      <span className="ml-2 text-xs">{isRotated ? 'Portrait' : 'Landscape'}</span>
    </Button>
  );
};

export default MobileRotateButton;