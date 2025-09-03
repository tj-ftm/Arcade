import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CountdownScreenProps {
  onCountdownComplete: () => void;
  gameType: 'uno' | 'snake';
}

const CountdownScreen: React.FC<CountdownScreenProps> = ({ onCountdownComplete, gameType }) => {
  const [count, setCount] = useState(3);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished, hide and call completion
      setTimeout(() => {
        setIsVisible(false);
        onCountdownComplete();
      }, 500);
    }
  }, [count, onCountdownComplete]);

  const getGameTheme = () => {
    switch (gameType) {
      case 'uno':
        return {
          bg: 'bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900',
          text: 'text-yellow-400',
          border: 'border-yellow-400',
          shadow: 'shadow-yellow-400/50'
        };
      case 'snake':
        return {
          bg: 'bg-gray-800 bg-gradient-to-br from-gray-900 via-gray-700 to-black',
          text: 'text-green-400',
          border: 'border-green-400',
          shadow: 'shadow-green-400/50'
        };
      default:
        return {
          bg: 'bg-gray-800',
          text: 'text-white',
          border: 'border-white',
          shadow: 'shadow-white/50'
        };
    }
  };

  const theme = getGameTheme();

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center z-[9999]",
      theme.bg
    )}>
      <div className="text-center animate-fade-in">
        <h1 className={cn(
          "text-6xl sm:text-8xl md:text-9xl font-headline uppercase tracking-wider mb-8",
          theme.text
        )} style={{ WebkitTextStroke: '2px black', textShadow: '0 0 20px rgba(255, 255, 0, 0.5)' }}>
          {gameType.toUpperCase()}
        </h1>
        
        <div className="mb-8">
          <p className={cn("text-2xl sm:text-3xl font-headline mb-4", theme.text)}>
            Get Ready!
          </p>
        </div>
        
        <div className={cn(
          "w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full border-8 flex items-center justify-center transition-all duration-300 transform",
          theme.border,
          theme.shadow,
          count > 0 ? "animate-pulse scale-110" : "scale-100"
        )}>
          <span className={cn(
            "text-6xl sm:text-8xl font-bold font-headline",
            theme.text,
            count > 0 ? "animate-bounce" : ""
          )}>
            {count > 0 ? count : 'GO!'}
          </span>
        </div>
        
        {count === 0 && (
          <p className={cn("text-xl sm:text-2xl font-headline mt-4 animate-pulse", theme.text)}>
            Game Starting...
          </p>
        )}
      </div>
    </div>
  );
};

export default CountdownScreen;