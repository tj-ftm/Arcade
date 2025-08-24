"use client";

import { Button } from '@/components/ui/button';
import { Play, ArrowLeft } from 'lucide-react';

interface UnoStartScreenProps {
  onStartGame: () => void;
  onGoToMenu: () => void;
  onStartMultiplayer: () => void;
}

export const UnoStartScreen = ({ onStartGame, onGoToMenu, onStartMultiplayer }: UnoStartScreenProps) => {
  return (
    <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-50 p-4 sm:p-6 md:p-8">
      {/* Game Title */}
      <div className="text-center">
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-headline text-red-600 uppercase tracking-wider mb-4" style={{ WebkitTextStroke: '4px black', textShadow: '0 0 20px rgba(220, 38, 38, 0.5)' }}>
          UNO
        </h1>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4 mt-4">
        <Button 
          size="lg" 
          onClick={onStartGame}
          className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-red-600 hover:bg-red-700 text-white border-2 border-white/20"
        >
          <Play className="mr-4 h-8 w-8" />
          Start Game
        </Button>
        <Button 
          size="lg" 
          onClick={onStartMultiplayer}
          className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-blue-600 hover:bg-blue-700 text-white border-2 border-white/20"
        >
          <Play className="mr-4 h-8 w-8" />
          Multiplayer
        </Button>
        {/* Rewards Info */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 rounded-xl p-4 border border-yellow-400/30">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">ARC</span>
            </div>
            <p className="text-yellow-400 font-medium text-sm sm:text-base md:text-lg">
              Win to earn 100 ARC tokens!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};