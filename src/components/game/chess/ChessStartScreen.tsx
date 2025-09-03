"use client";

import { Button } from '@/components/ui/button';
import { Play, Users, Coins, Home, PanelLeft } from 'lucide-react';
interface ChessStartScreenProps {
  onStartGame: () => void;
  onStartMultiplayer?: () => void;
  onStartBonusMode: () => void;
  onNavigateToBetting?: () => void;
  onGoToMenu?: () => void;
}

export const ChessStartScreen = ({ onStartGame, onStartMultiplayer, onStartBonusMode, onNavigateToBetting, onGoToMenu }: ChessStartScreenProps) => {
  return (
    <div className="absolute inset-0 bg-purple-800 bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-[200000] p-4 sm:p-6 md:p-8 pt-20 md:pt-24 lg:pt-28">

      {/* Game Title */}
      <div className="text-center">
        <h1 className="text-7xl sm:text-7xl md:text-8xl lg:text-9xl font-headline text-purple-600 uppercase tracking-wider mb-4" style={{ WebkitTextStroke: '0.5px white', textShadow: '0 0 20px rgba(128, 0, 128, 0.5)' }}>
          CHESS
        </h1>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4 mt-4">
        <Button 
          size="lg" 
          onClick={onStartBonusMode}
          className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-2 border-green-400/30"
        >
          <Play className="mr-4 h-8 w-8" />
          Pay & Play (0.1 S)
        </Button>
        {onStartMultiplayer && (
          <Button 
            size="lg" 
            onClick={onStartMultiplayer}
            className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-white/20"
          >
            <Users className="mr-4 h-8 w-8" />
            Multiplayer
          </Button>
        )}
        {onNavigateToBetting && (
          <Button 
            size="lg" 
            onClick={onNavigateToBetting}
            className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white border-2 border-yellow-400/30 shadow-lg"
          >
            <Coins className="mr-4 h-8 w-8" />
            Bet Mode
          </Button>
        )}
        <Button 
          size="lg" 
          onClick={onStartBonusMode}
          className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white border-2 border-yellow-400/30"
        >
          <Play className="mr-4 h-8 w-8" />
          Bonus Mode (0.1 S)
        </Button>
        {/* Rewards Info */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 rounded-xl p-4 border border-yellow-400/30">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">ARC</span>
            </div>
            <p className="text-yellow-400 font-medium text-sm sm:text-base md:text-lg">
              Win to earn 100 ARC tokens! (200 ARC in Bonus Mode)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};