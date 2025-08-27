import { Button } from '@/components/ui/button';
import { Play, Swords, Coins, Trophy } from 'lucide-react';

interface ChessStartScreenProps {
  onStartGame: () => void;
  onGoToMenu: () => void;
  onStartMultiplayer: () => void;
  onStartBetting?: () => void;
}

export const ChessStartScreen = ({ onStartGame, onGoToMenu, onStartMultiplayer, onStartBetting }: ChessStartScreenProps) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-50 p-4 sm:p-6 md:p-8 pt-20 md:pt-24 lg:pt-28">
      {/* Game Title */}
      <div className="text-center">
        <h1 className="text-9xl sm:text-9xl md:text-9xl lg:text-9xl font-headline text-white uppercase tracking-wider mb-4" style={{ WebkitTextStroke: '2px #333', textShadow: '0 0 20px rgba(255, 255, 255, 0.3)' }}>
          CHESS
        </h1>
        <p className="text-gray-300 text-lg font-medium">The ultimate strategy game</p>
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
          className="font-headline text-xl sm:text-2xl md:text-3xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-purple-700 hover:bg-purple-600 text-white border-2 border-white/20"
        >
          <Play className="mr-4 h-8 w-8" />
          Start Game
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
          <Swords className="mr-4 h-8 w-8" />
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
        <div className="bg-gradient-to-r from-purple-600/20 to-indigo-400/20 rounded-xl p-4 border border-purple-400/30">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">ARC</span>
            </div>
            <p className="text-white font-medium text-sm sm:text-base md:text-lg">
              Win to earn 50 ARC tokens!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};