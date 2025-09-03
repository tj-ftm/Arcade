import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CountdownScreenProps {
  onCountdownComplete: () => void;
  gameType: 'uno' | 'snake';
}

export const CountdownScreen: React.FC<CountdownScreenProps> = ({
  onCountdownComplete,
  gameType
}) => {
  const [count, setCount] = useState(3);
  const [isVisible, setIsVisible] = useState(true);

  // Game-specific styling
  const getGameTheme = () => {
    switch (gameType) {
      case 'uno':
        return {
          bg: 'bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900',
          text: 'text-yellow-400',
          glow: 'shadow-yellow-400/50',
          border: 'border-yellow-400/30'
        };
      case 'snake':
        return {
          bg: 'bg-green-800 bg-gradient-to-br from-green-900 via-green-700 to-lime-900',
          text: 'text-green-400',
          glow: 'shadow-green-400/50',
          border: 'border-green-400/30'
        };
      default:
        return {
          bg: 'bg-gray-800',
          text: 'text-white',
          glow: 'shadow-white/50',
          border: 'border-white/30'
        };
    }
  };

  const theme = getGameTheme();

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Show "GO!" for a brief moment then complete
      const goTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onCountdownComplete();
        }, 200);
      }, 800);
      return () => clearTimeout(goTimer);
    }
  }, [count, onCountdownComplete]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "absolute inset-0 flex flex-col items-center justify-center z-[300000]",
      theme.bg
    )}>
      <div className="text-center animate-fade-in">
        <div className={cn(
          "text-9xl sm:text-[12rem] md:text-[15rem] font-headline font-bold uppercase tracking-wider mb-8 transition-all duration-300 transform",
          theme.text,
          count > 0 ? "animate-bounce scale-110" : "animate-pulse scale-125",
          "drop-shadow-2xl"
        )} style={{ 
          WebkitTextStroke: '4px black',
          textShadow: `0 0 30px ${gameType === 'uno' ? 'rgba(255, 255, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)'}` 
        }}>
          {count > 0 ? count : 'GO!'}
        </div>
        
        {count > 0 && (
          <div className={cn(
            "text-2xl sm:text-3xl md:text-4xl font-headline uppercase tracking-wider",
            theme.text,
            "opacity-75 animate-pulse"
          )}>
            Get Ready...
          </div>
        )}
        
        {count === 0 && (
          <div className={cn(
            "text-3xl sm:text-4xl md:text-5xl font-headline uppercase tracking-wider",
            theme.text,
            "opacity-90 animate-bounce"
          )}>
            Game Starting!
          </div>
        )}
      </div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-2 h-2 rounded-full animate-ping",
              theme.text.replace('text-', 'bg-'),
              "opacity-20"
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CountdownScreen;