"use client";

import { Button } from '@/components/ui/button';
import { Play, ArrowLeft } from 'lucide-react';

interface UnoStartScreenProps {
  onStartGame: () => void;
  onGoToMenu: () => void;
}

export const UnoStartScreen = ({ onStartGame, onGoToMenu }: UnoStartScreenProps) => {
  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-8 animate-fade-in rounded-xl z-50">
      {/* Game Title */}
      <div className="text-center">
        <h1 className="text-8xl md:text-9xl font-headline text-red-600 uppercase tracking-wider mb-4" style={{ WebkitTextStroke: '4px black', textShadow: '0 0 20px rgba(220, 38, 38, 0.5)' }}>
          UNO
        </h1>
        <p className="text-2xl md:text-3xl text-white/80 font-medium">
          Match colors and numbers to win!
        </p>
      </div>

      {/* Game Rules */}
      <div className="bg-black/50 rounded-xl p-6 max-w-2xl mx-4">
        <h3 className="text-xl md:text-2xl text-accent font-bold mb-4 text-center">How to Play</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90">
          <div className="space-y-2">
            <p className="text-sm md:text-base">• Match the color or number of the top card</p>
            <p className="text-sm md:text-base">• Use Wild cards to change colors</p>
            <p className="text-sm md:text-base">• Draw Two makes opponent draw 2 cards</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm md:text-base">• Skip cards skip opponent's turn</p>
            <p className="text-sm md:text-base">• Reverse changes play direction</p>
            <p className="text-sm md:text-base">• First to empty their hand wins!</p>
          </div>
        </div>
      </div>

      {/* Rewards Info */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 rounded-xl p-4 border border-yellow-400/30">
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-sm">ARC</span>
          </div>
          <p className="text-yellow-400 font-medium text-lg">
            Win to earn 100 ARC tokens!
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          size="lg" 
          onClick={onStartGame}
          className="font-headline text-2xl px-8 py-4 bg-red-600 hover:bg-red-700 text-white border-2 border-white/20"
        >
          <Play className="mr-3 h-6 w-6" />
          Start Game
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          onClick={onGoToMenu}
          className="font-headline text-2xl px-8 py-4 border-2 border-white/40 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-3 h-6 w-6" />
          Back to Menu
        </Button>
      </div>
    </div>
  );
};