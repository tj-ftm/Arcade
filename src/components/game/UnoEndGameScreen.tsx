"use client";

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useWeb3 } from '../web3/Web3Provider';

interface UnoEndGameScreenProps {
  hasWon: boolean;
  onNewGame: () => void;
  onBackToMenu: () => void;
  isMinting: boolean;
  mintTxHash: string;
  tokensEarned: number;
}

export const UnoEndGameScreen: React.FC<UnoEndGameScreenProps> = ({
  hasWon,
  onNewGame,
  onBackToMenu,
  isMinting,
  mintTxHash,
  tokensEarned,
}) => {
  const { isValidWallet } = useWeb3();

  return (
    <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 flex flex-col items-center justify-center h-full p-4 sm:p-6 md:p-8">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-lg text-center max-w-md w-full">
        <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
          {hasWon ? 'You Won!' : 'You Lost!'}
        </h2>
        

        {isMinting && tokensEarned > 0 && (
          <div className="mb-6 flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
            <p className="text-base sm:text-lg text-white">Minting {tokensEarned} ARC tokens!</p>
            <p className="text-sm text-gray-300">Please wait for the transaction to complete.</p>
          </div>
        )}

        {!isMinting && mintTxHash && (
          <div className="mb-6">
            <p className="text-base sm:text-lg text-white">{tokensEarned} ARC Minted!</p>
            <p className="text-sm text-gray-300 break-all">Tx Hash: <a href={`https://sonicscan.org/tx/${mintTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">{mintTxHash}</a></p>
          </div>
        )}

        {!hasWon && !isValidWallet && (
          <div className="mb-6">
            <p className="text-base sm:text-lg font-bold text-white">Connect wallet and play to earn ARC tokens</p>
          </div>
        )}

        {hasWon && !isMinting && !mintTxHash && isValidWallet && (
          <div className="mb-6">
            <p className="text-base sm:text-lg font-bold text-white">Play to earn ARC tokens!</p>
          </div>
        )}

        <div className="flex flex-col space-y-4">
          <Button
            onClick={onNewGame}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-lg py-2 sm:py-3 rounded-lg"
          >
            Play Again
          </Button>
          <Button
            onClick={onBackToMenu}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white text-base sm:text-lg py-2 sm:py-3 rounded-lg"
          >
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
};