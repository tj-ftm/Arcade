
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWeb3 } from './Web3Provider';
import { Loader2, Ticket, X } from 'lucide-react';

interface PayToPlayModalProps {
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

export const PayToPlayModal = ({ onPaymentSuccess, onCancel }: PayToPlayModalProps) => {
  const { account, connect, payForGame } = useWeb3();
  const [status, setStatus] = useState<'idle' | 'paying' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handlePlayClick = async () => {
    if (!account) {
      await connect();
      // After connecting, the user will need to click again.
      // This is a simple flow; a more complex one could auto-trigger payment.
      return; 
    }

    setStatus('paying');
    setError('');

    try {
      const success = await payForGame();
      if (success) {
        setStatus('success');
        setTimeout(() => {
            onPaymentSuccess();
        }, 1000); // Give a moment to show success before starting
      } else {
        throw new Error('Transaction failed or was cancelled.');
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'An unknown error occurred.');
      console.error(err);
    }
  };

  const getStatusContent = () => {
    switch(status) {
        case 'paying':
            return (
                <>
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <h3 className="text-xl font-semibold mt-4">Processing Payment...</h3>
                    <p className="text-md text-muted-foreground">Please confirm the transaction in your wallet.</p>
                </>
            );
        case 'success':
             return (
                <>
                    <Ticket className="h-16 w-16 text-green-500" />
                    <h3 className="text-xl font-semibold mt-4">Payment Successful!</h3>
                    <p className="text-md text-muted-foreground">Get ready to play!</p>
                </>
            );
        case 'error':
             return (
                <>
                    <h3 className="text-xl font-semibold mt-4 text-red-500">Payment Failed</h3>
                    <p className="text-md text-muted-foreground max-w-xs">{error}</p>
                    <Button onClick={handlePlayClick} className="mt-4">Try Again</Button>
                </>
            )
        case 'idle':
        default:
            return (
                <>
                    <Ticket className="h-24 w-24 text-primary" />
                    <h2 className="text-3xl font-headline uppercase mt-4">Entry Fee: 0.1 S</h2>
                    <p className="text-white/70 mb-8 text-lg">Pay the entry fee to start the game.</p>
                    <Button size="lg" onClick={handlePlayClick} className="w-full h-16 text-2xl font-headline rounded-lg">
                        {account ? "Pay and Play" : "Connect to Play"}
                    </Button>
                </>
            )
    }
  }

  return (
    <div className="w-full max-w-md z-10 text-center my-auto animate-fade-in">
      <div className="bg-black/50 p-8 rounded-xl flex flex-col items-center relative">
         <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={onCancel}>
            <X />
         </Button>
        {getStatusContent()}
      </div>
    </div>
  );
};
