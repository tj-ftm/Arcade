import { Button } from '@/components/ui/button';
import { Play, ArrowLeft, Coins, Trophy, Home, PanelLeft } from 'lucide-react';

interface PoolStartScreenProps {
  onStartGame: () => void;
  onGoToMenu: () => void;
  onStartMultiplayer: () => void;
  onStartBetting?: () => void;
  onStartBonusMode?: () => void;
}

export const PoolStartScreen = ({ onStartGame, onGoToMenu, onStartMultiplayer, onStartBetting, onStartBonusMode }: PoolStartScreenProps) => {
  return (
    <div className="absolute inset-0 bg-green-800 bg-gradient-to-br from-green-900 via-green-700 to-emerald-900 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-[200000] p-4 sm:p-6 md:p-8 pt-20 md:pt-24 lg:pt-28">

      {/* Game Title */}
      <div className="text-center">
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-8xl xl:text-9xl font-headline text-lime-400 uppercase tracking-wider mb-4" style={{ WebkitTextStroke: '2px black', textShadow: '0 0 20px rgba(124, 252, 0, 0.5)' }}>
          8-BALL POOL
        </h1>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4 mt-4">
        <Button 
          size="lg" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartGame();
          }}
          className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-gray-600 hover:bg-gray-700 text-white border-2 border-white/20"
        >
          <Play className="mr-4 h-8 w-8" />
          Free Play
        </Button>
        <Button 
          size="lg" 
          onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             onStartBonusMode?.();
           }}
          className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-2 border-green-400/30"
        >
          <Play className="mr-4 h-8 w-8" />
          Pay & Play (0.1 S)
        </Button>
        <Button 
          size="lg" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartMultiplayer();
          }}
          className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-blue-600 hover:bg-blue-700 text-white border-2 border-white/20"
        >
          <Play className="mr-4 h-8 w-8" />
          Multiplayer
        </Button>
        
        {onStartBetting && (
          <Button 
            size="lg" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStartBetting();
            }}
            className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white border-2 border-yellow-400/30 shadow-lg"
          >
            <Coins className="mr-4 h-8 w-8" />
            Bet Mode
          </Button>
        )}

        {/* Rewards Info */}
        <div className="bg-gradient-to-r from-lime-600/20 to-lime-400/20 rounded-xl p-4 border border-lime-400/30">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">ARC</span>
            </div>
            <p className="text-lime-400 font-medium text-sm sm:text-base md:text-lg">
              Win to earn 50 ARC tokens!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};