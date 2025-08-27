import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useWeb3 } from '../web3/Web3Provider';

interface PoolEndGameScreenProps {
  hasWon: boolean;
  onNewGame: () => void;
  onBackToMenu: () => void;
  isMinting: boolean;
  mintTxHash: string;
  tokensEarned: number;
  isMultiplayer?: boolean;
}

export const PoolEndGameScreen: React.FC<PoolEndGameScreenProps> = ({
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
    <div className="absolute inset-0 bg-green-800 bg-gradient-to-br from-green-900 via-green-700 to-emerald-900 flex flex-col items-center justify-center h-full p-4 sm:p-6 md:p-8 z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-lg text-center max-w-md w-full">
        {!isMultiplayer && isMinting && hasWon && tokensEarned > 0 ? (
          <Loader2 className="w-24 h-24 text-white mx-auto mb-4 animate-spin" />
        ) : null}
        <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
          {hasWon ? (isMultiplayer ? 'You Won!' : 'You Won!') : (isMultiplayer ? 'You Lost!' : 'You Lost!')}
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
            className="w-full bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg py-2 sm:py-3 rounded-lg"
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