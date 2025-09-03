import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentLoadingScreenProps {
  isVisible: boolean;
  paymentTxHash?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  gameType: 'uno' | 'chess' | 'snake' | 'pool';
}

type PaymentStatus = 'waiting' | 'processing' | 'confirming' | 'success' | 'failed';

const getGameGradient = (gameType: string) => {
  switch (gameType) {
    case 'uno':
      return 'from-red-900 via-red-700 to-orange-900';
    case 'chess':
      return 'from-purple-900 via-purple-700 to-indigo-900';
    case 'snake':
      return 'from-green-900 via-green-700 to-lime-900';
    case 'pool':
      return 'from-green-900 via-green-700 to-emerald-900';
    default:
      return 'from-gray-900 via-gray-700 to-black';
  }
};

const getGameColor = (gameType: string) => {
  switch (gameType) {
    case 'uno':
      return 'text-yellow-400';
    case 'chess':
      return 'text-purple-400';
    case 'snake':
      return 'text-green-400';
    case 'pool':
      return 'text-lime-400';
    default:
      return 'text-white';
  }
};

export const PaymentLoadingScreen = ({ 
  isVisible, 
  paymentTxHash, 
  onCancel, 
  onSuccess, 
  gameType 
}: PaymentLoadingScreenProps) => {
  const [status, setStatus] = useState<PaymentStatus>('waiting');
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setStatus('waiting');
      setProgress(0);
      setTimeElapsed(0);
      return;
    }

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    if (!paymentTxHash) {
      setStatus('waiting');
      setProgress(25);
    } else {
      setStatus('processing');
      setProgress(50);
      
      // Simulate confirmation process
      const confirmTimer = setTimeout(() => {
        setStatus('confirming');
        setProgress(75);
        
        const successTimer = setTimeout(() => {
          setStatus('success');
          setProgress(100);
          
          const completeTimer = setTimeout(() => {
            onSuccess?.();
          }, 2000);
          
          return () => clearTimeout(completeTimer);
        }, 3000);
        
        return () => clearTimeout(successTimer);
      }, 2000);
      
      return () => clearTimeout(confirmTimer);
    }
  }, [paymentTxHash, isVisible, onSuccess]);

  if (!isVisible) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'waiting':
        return 'Waiting for payment confirmation...';
      case 'processing':
        return 'Processing payment transaction...';
      case 'confirming':
        return 'Confirming transaction on blockchain...';
      case 'success':
        return 'Payment confirmed! Starting game...';
      case 'failed':
        return 'Payment failed. Please try again.';
      default:
        return 'Processing...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-400" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-400" />;
      default:
        return <Loader2 className="w-16 h-16 animate-spin text-blue-400" />;
    }
  };

  return (
    <div className={cn(
      "absolute inset-0 z-50 flex items-center justify-center",
      "bg-gradient-to-br",
      getGameGradient(gameType)
    )}>
      <div className="w-full max-w-md mx-4">
        <div className="bg-black/80 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className={cn(
              "text-4xl font-headline uppercase tracking-wider mb-2",
              getGameColor(gameType)
            )}>
              Pay & Play
            </h1>
            <p className="text-white/70 text-lg">0.1 S Payment Required</p>
          </div>

          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-white/60 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  status === 'success' ? 'bg-green-400' : 
                  status === 'failed' ? 'bg-red-400' : 'bg-blue-400'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center mb-6">
            <p className="text-white text-lg font-medium mb-2">
              {getStatusMessage()}
            </p>
            <p className="text-white/50 text-sm">
              Time elapsed: {formatTime(timeElapsed)}
            </p>
          </div>

          {/* Transaction Hash */}
          {paymentTxHash && (
            <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/70 text-sm mb-2">Transaction Hash:</p>
              <div className="flex items-center gap-2">
                <code className="text-blue-400 text-xs break-all flex-1">
                  {paymentTxHash}
                </code>
                <a
                  href={`https://sonicscan.org/tx/${paymentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {status === 'failed' && onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Try Again
              </Button>
            )}
            {(status === 'waiting' || status === 'processing') && onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            )}
            {status === 'success' && (
              <Button
                disabled
                className="flex-1 bg-green-600 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Payment Confirmed
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-white/40 text-xs">
              {status === 'waiting' && "Please confirm the payment in your wallet"}
              {status === 'processing' && "Do not close this window while processing"}
              {status === 'confirming' && "Waiting for blockchain confirmation"}
              {status === 'success' && "Redirecting to game..."}
              {status === 'failed' && "Check your wallet and try again"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentLoadingScreen;