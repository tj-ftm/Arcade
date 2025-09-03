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
  isMultiplayer?: boolean;
}

export const UnoEndGameScreen: React.FC<UnoEndGameScreenProps> = ({
  hasWon,
  onNewGame,
  onBackToMenu,
  isMinting,
  mintTxHash,
  tokensEarned,
  isMultiplayer = false,
}) => {
  const { isValidWallet } = useWeb3();

  return (
    <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 flex flex-col items-center justify-center h-full p-4 sm:p-6 md:p-8 z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-lg text-center max-w-md w-full">
        {!isMultiplayer && isMinting && hasWon && tokensEarned > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Loader2 className="w-32 h-32 text-yellow-400 mx-auto mb-4 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-yellow-400/20 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        )}
        <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
          {hasWon ? (isMultiplayer ? 'UNO! You Won!' : 'You Won!') : (isMultiplayer ? 'You Lost!' : 'You Lost!')}
        </h2>
        
        {!isMultiplayer && hasWon && (
          <p className="text-lg text-white mb-6">
            {isMinting && tokensEarned > 0 ? 'Wait for the Tokens to be minted' : 
             mintTxHash ? 'Tokens have been minted!' : 
             'Wait for the Tokens to be minted'}
          </p>
        )}

        {!isMultiplayer && isMinting && hasWon && tokensEarned > 0 && (
          <div className="mb-6">
            <p className="text-base sm:text-lg text-white">Minting {tokensEarned} ARC tokens!</p>
            <p className="text-sm text-gray-300">Please wait for the transaction to complete.</p>
          </div>
        )}

        {!isMultiplayer && !isMinting && mintTxHash && hasWon && (
          <div className="mb-6">
            <p className="text-base sm:text-lg text-white">{tokensEarned} ARC Minted!</p>
            <p className="text-sm text-gray-300 break-all">Tx Hash: <a href={`https://sonicscan.org/tx/${mintTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">{mintTxHash}</a></p>
          </div>
        )}

        {!isMultiplayer && hasWon && !isMinting && !mintTxHash && isValidWallet && (
          <div className="mb-6">
            <p className="text-base sm:text-lg font-bold text-white">Play to earn ARC tokens!</p>
          </div>
        )}

        {!isMultiplayer && !hasWon && !isValidWallet && (
          <div className="mb-6">
            <p className="text-base sm:text-lg font-bold text-white">Connect wallet and play to earn ARC tokens</p>
          </div>
        )}

        <div className="flex flex-col space-y-4">
          <Button
            onClick={onNewGame}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-base sm:text-lg py-2 sm:py-3 rounded-lg"
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