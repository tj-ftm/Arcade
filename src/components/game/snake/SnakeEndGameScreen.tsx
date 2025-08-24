import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface SnakeEndGameScreenProps {
  score: number;
  onPlayAgain: () => void;
  onGoToMenu: () => void;
  mintTxHash: string;
  account: string | null;
  isMinting: boolean;
  tokensEarned: number;
}

export const SnakeEndGameScreen: React.FC<SnakeEndGameScreenProps> = ({
  score,
  onPlayAgain,
  onGoToMenu,
  mintTxHash,
  account,
  isMinting,
  tokensEarned,
}) => {
  const isValidWallet = !!account;

  return (
    <div className="absolute inset-0 bg-green-800 bg-gradient-to-br from-green-900 via-green-700 to-lime-900 flex flex-col items-center justify-center h-full p-4 sm:p-6 md:p-8">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-lg text-center max-w-md w-full">
        {isMinting ? (
          <Loader2 className="w-24 h-24 text-blue-500 mx-auto mb-4 animate-spin" />
        ) : null /* No icon for Game Over */}
        <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
          Game Over
        </h2>
        <p className="text-base sm:text-lg font-bold text-white mb-6">
          Score: {score}
        </p>

        {isMinting && isValidWallet && tokensEarned > 0 && (
          <div className="mb-6">
            <p className="text-base sm:text-lg text-white">Minting {tokensEarned} ARC tokens!</p>
            <p className="text-sm text-gray-300">Please wait for the transaction to complete.</p>
          </div>
        )}

        {mintTxHash && isValidWallet && !isMinting && (
          <div className="mb-6">
            <p className="text-base sm:text-lg text-white">{tokensEarned} ARC Minted!</p>
            <p className="text-sm text-gray-300 break-all">Tx Hash: {mintTxHash}</p>
            <a
              href={`https://sonicscan.org/tx/${mintTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm"
            >
              View on Sonicscan
            </a>
          </div>
        )}

        {!isValidWallet && (
          <div className="mb-6">
            <p className="text-base sm:text-lg font-bold text-white">Play to earn ARC tokens!</p>
          </div>
        )}

        <div className="flex flex-col space-y-4">
          <Button
            onClick={onPlayAgain}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg py-2 sm:py-3 rounded-lg"
          >
            Play Again
          </Button>
          <Button
            onClick={onGoToMenu}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white text-base sm:text-lg py-2 sm:py-3 rounded-lg"
          >
            Back to Menu
          </Button>
        </div>
      </div>

    </div>
  );
};