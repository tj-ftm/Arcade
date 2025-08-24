"use client";

import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { MintSuccessModal } from './MintSuccessModal';
import { useState } from 'react';

interface UnoEndGameScreenProps {
  winner: string;
  playerScore: number;
  botScore: number;
  onPlayAgain: () => void;
  onGoToMenu: () => void;
  mintTxHash?: string;
}

export const UnoEndGameScreen: React.FC<UnoEndGameScreenProps> = ({
  winner,
  playerScore,
  botScore,
  onPlayAgain,
  onGoToMenu,
  mintTxHash,
}) => {
  const isPlayerWinner = winner === 'player';
  const [showMintSuccess, setShowMintSuccess] = useState(!!mintTxHash);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-lg text-center max-w-md w-full">
        {isPlayerWinner ? (
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
        ) : (
          <XCircle className="w-24 h-24 text-red-500 mx-auto mb-4" />
        )}
        <h2 className="text-4xl font-bold mb-2 text-white">
          {isPlayerWinner ? 'You Won!' : 'You Lost!'}
        </h2>
        <p className="text-xl text-white mb-6">
          Player Score: {playerScore} - Bot Score: {botScore}
        </p>

        {isPlayerWinner && mintTxHash && (
          <div className="mb-6">
            <p className="text-lg text-white">100 ARC Minted!</p>
            <p className="text-sm text-gray-300 break-all">Tx Hash: {mintTxHash}</p>
          </div>
        )}

        <div className="flex flex-col space-y-4">
          <Button
            onClick={onPlayAgain}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 rounded-lg"
          >
            Play Again
          </Button>
          <Button
            onClick={onGoToMenu}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white text-lg py-3 rounded-lg"
          >
            Back to Menu
          </Button>
        </div>
      </div>

      {isPlayerWinner && mintTxHash && showMintSuccess && (
        <MintSuccessModal
          isOpen={showMintSuccess}
          onClose={() => setShowMintSuccess(false)}
          txHash={mintTxHash}
          amount={100}
          token="ARC"
        />
      )}
    </div>
  );
};