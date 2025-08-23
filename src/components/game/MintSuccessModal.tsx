"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface MintSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash: string;
  gameName: string;
  tokensEarned?: number;
}

export const MintSuccessModal: React.FC<MintSuccessModalProps> = ({
  isOpen,
  onClose,
  txHash,
  gameName,
  tokensEarned = 1,
}) => {
  const sonicScanUrl = `https://sonicscan.org/tx/${txHash}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 text-white border-primary-foreground/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-accent">Congratulations!</DialogTitle>
          <DialogDescription className="text-center text-lg text-gray-300">
            You won the {gameName} game!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-4">
          <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
          <p className="text-xl font-semibold mb-2">You earned {tokensEarned} ARC Token{tokensEarned > 1 ? 's' : ''}!</p>
          <p className="text-sm text-gray-400 text-center mb-4">
            Your reward has been minted on the blockchain.
          </p>
          {txHash && (
            <div className="text-center mb-4">
              <p className="text-sm text-gray-400">Transaction Hash:</p>
              <a
                href={sonicScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm break-all"
              >
                {txHash}
              </a>
            </div>
          )}
          <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded">
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};