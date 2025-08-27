"use client";

import { Button } from '@/components/ui/button';
import { Play, ArrowLeft, Coins } from 'lucide-react';

interface UnoStartScreenProps {
  onStartGame: () => void;
  onGoToMenu: () => void;
  onStartMultiplayer: () => void;
  onStartBonusMode: () => void;
  onNavigateToBetting?: () => void;
}

export const UnoStartScreen = ({ onStartGame, onGoToMenu, onStartMultiplayer, onStartBonusMode, onNavigateToBetting }: UnoStartScreenProps) => {
  return (
    <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-10 p-4 sm:p-6 md:p-8 pt-20 md:pt-24 lg:pt-28">
      {/* Game Title */}
      <div className="text-center">
        <h1 className="text-9xl sm:text-9xl md:text-9xl lg:text-9xl font-headline text-yellow-400 uppercase tracking-wider mb-4" style={{ WebkitTextStroke: '2px black', textShadow: '0 0 20px rgba(255, 255, 0, 0.5)' }}>
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
        <Button 
          size="lg" 
          onClick={onStartBonusMode}
          className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white border-2 border-yellow-400/30"
        >
          <Play className="mr-4 h-8 w-8" />
          Bonus Mode (0.1 S)
        </Button>
        
        {onNavigateToBetting && (
          <Button 
            size="lg" 
            onClick={onNavigateToBetting}
            className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-2 border-orange-400/30 shadow-lg"
          >
            <Coins className="mr-4 h-8 w-8" />
            Bet Mode
          </Button>
        )}

        {/* Rewards Info */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 rounded-xl p-4 border border-yellow-400/30">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">ARC</span>
            </div>
            <p className="text-yellow-400 font-medium text-sm sm:text-base md:text-lg">
              Win to earn 50 ARC tokens! (100 ARC in Bonus Mode)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};