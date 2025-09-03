import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useWeb3 } from '../web3/Web3Provider';
import { ConnectWallet } from '../web3/ConnectWallet';
import { sendBonusPayment } from '@/lib/payment-verification';

interface PaymentLoadingScreenProps {
  onPaymentComplete: () => void;
  onCancel: () => void;
  gameType: 'uno' | 'chess' | 'snake';
  amount: string;
}

type PaymentStatus = 'waiting' | 'processing' | 'completed' | 'failed' | 'timeout';

const PaymentLoadingScreen: React.FC<PaymentLoadingScreenProps> = ({
  onPaymentComplete,
  onCancel,
  gameType,
  amount
}) => {
  const { getProvider, getSigner, account } = useWeb3();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('waiting');
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes timeout for real transactions
  const [statusMessage, setStatusMessage] = useState('Initiating payment...');
  const [txHash, setTxHash] = useState<string>('');

  // Game-specific styling
  const getGameTheme = () => {
    switch (gameType) {
      case 'uno':
        return {
          bg: 'bg-gradient-to-br from-red-600 via-yellow-500 to-blue-600',
          accent: 'text-yellow-400',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'chess':
        return {
          bg: 'bg-gradient-to-br from-amber-900 via-yellow-600 to-amber-800',
          accent: 'text-amber-300',
          button: 'bg-amber-700 hover:bg-amber-800'
        };
      case 'snake':
        return {
          bg: 'bg-gradient-to-br from-green-800 via-lime-600 to-green-700',
          accent: 'text-lime-300',
          button: 'bg-green-600 hover:bg-green-700'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-purple-600 to-blue-600',
          accent: 'text-blue-300',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
    }
  };

  const theme = getGameTheme();

  // Real payment processing
  useEffect(() => {
    const processPayment = async () => {
      if (!account) {
        // Don't set failed status, just wait for wallet connection
        setStatusMessage('Please connect your wallet to continue.');
        return;
      }

      try {
        setStatusMessage('Preparing transaction...');
        setProgress(10);
        
        const provider = getProvider();
        const signer = getSigner();
        
        if (!provider || !signer) {
          throw new Error('Wallet not connected');
        }

        setStatusMessage('Sending payment transaction...');
        setProgress(30);
        setPaymentStatus('processing');
        
        const paymentResult = await sendBonusPayment(provider, signer);
        
        if (paymentResult.success && paymentResult.transactionHash) {
          setTxHash(paymentResult.transactionHash);
          setStatusMessage('Transaction sent! Waiting for confirmation...');
          setProgress(60);
          
          // Wait for transaction confirmation
          const receipt = await provider.waitForTransaction(paymentResult.transactionHash);
          
          if (receipt && receipt.status === 1) {
            setProgress(100);
            setPaymentStatus('completed');
            setStatusMessage('Payment confirmed! Starting game...');
            
            setTimeout(() => {
              onPaymentComplete();
            }, 1500);
          } else {
            throw new Error('Transaction failed');
          }
        } else {
          throw new Error(paymentResult.error || 'Payment failed');
        }
      } catch (error: any) {
        console.error('Payment error:', error);
        setPaymentStatus('failed');
        setStatusMessage(error.message || 'Payment failed. Please try again.');
        setProgress(0);
      }
    };

    // Start payment process immediately
    processPayment();
  }, [account, getProvider, getSigner, onPaymentComplete]);

  // Timeout timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1 && paymentStatus !== 'completed') {
          setPaymentStatus('timeout');
          setStatusMessage('Payment timeout. Please try again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentStatus]);

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'waiting':
      case 'processing':
        return <Loader2 className="w-16 h-16 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-16 h-16 text-green-400" />;
      case 'failed':
      case 'timeout':
        return <XCircle className="w-16 h-16 text-red-400" />;
      default:
        return <Clock className="w-16 h-16" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full h-full flex flex-col justify-center items-center text-white font-headline relative overflow-hidden ${theme.bg}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8 p-8 max-w-md mx-auto text-center">
        {/* Game Title */}
        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-wider">
          {gameType.toUpperCase()}
        </h1>

        {/* Payment Amount */}
        <div className={`text-2xl md:text-3xl font-bold ${theme.accent}`}>
          Pay & Play: {amount}
        </div>

        {/* Status Icon */}
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>

        {/* Status Message */}
        <div className="text-xl md:text-2xl font-semibold">
          {statusMessage}
        </div>
        
        {/* Connect Wallet Button */}
        {!account && (
          <div className="mt-4">
            <ConnectWallet />
          </div>
        )}

        {/* Progress Bar */}
        {paymentStatus === 'waiting' && (
          <div className="w-full bg-black/30 rounded-full h-4">
            <div 
              className={`h-4 rounded-full transition-all duration-300 ${theme.accent.replace('text-', 'bg-')}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Timer */}
        {(paymentStatus === 'waiting' || paymentStatus === 'processing') && (
          <div className="text-lg">
            Time remaining: <span className={theme.accent}>{formatTime(timeLeft)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          {(paymentStatus === 'failed' || paymentStatus === 'timeout') && (
            <Button
              onClick={onCancel}
              className={`px-8 py-3 text-lg font-bold uppercase tracking-wider ${theme.button} text-white border-2 border-white/20 hover:border-white/40 transition-all duration-300`}
            >
              Try Again
            </Button>
          )}
          
          {paymentStatus !== 'completed' && (
            <Button
              onClick={onCancel}
              variant="outline"
              className="px-8 py-3 text-lg font-bold uppercase tracking-wider bg-transparent text-white border-2 border-white/50 hover:bg-white/10 transition-all duration-300"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Transaction Hash */}
        {txHash && (
          <div className="text-sm opacity-75 max-w-sm break-all">
            <div className="text-center mb-2">Transaction Hash:</div>
            <div className="bg-black/30 rounded p-2 font-mono text-xs">
              {txHash}
            </div>
          </div>
        )}

        {/* Payment Instructions */}
        {paymentStatus === 'waiting' && (
          <div className="text-sm opacity-75 max-w-sm">
            Please confirm the transaction in your wallet. The game will start automatically once payment is confirmed on the blockchain.
          </div>
        )}
        
        {paymentStatus === 'processing' && (
          <div className="text-sm opacity-75 max-w-sm">
            Transaction submitted! Waiting for blockchain confirmation. This may take a few moments.
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentLoadingScreen;