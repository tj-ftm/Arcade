import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { ConnectWallet } from '@/components/web3/ConnectWallet';

interface GameRulesModalProps {
  gameName: string;
  rules: string[];
  onClose: () => void;
  onStartGame: () => void;
}

export const GameRulesModal: React.FC<GameRulesModalProps> = ({
  gameName,
  rules,
  onClose,
  onStartGame,
}) => {
  const { account } = useWeb3();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{gameName} Rules</DialogTitle>
          <DialogDescription>
            Read the rules carefully before starting the game. Connect your wallet to earn rewards!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            {rules.map((rule, index) => (
              <li key={index}>{rule}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-semibold text-red-500">
            Important: You need to connect your wallet before starting the game to earn rewards.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <Button variant="outline" onClick={onClose}>
            Back to Menu
          </Button>
          {account ? (
            <Button onClick={onStartGame}>
              Start Game
            </Button>
          ) : (
            <ConnectWallet />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};