"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { useWeb3 } from '../web3/Web3Provider';
import { ConnectWallet } from '../web3/ConnectWallet';
import { useGameBetting } from '@/lib/game-betting';
import { useFirebaseBetting } from '@/hooks/use-firebase-betting';
import { useToast } from '@/hooks/use-toast';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno' | 'pool';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
  betAmount?: string;
  isBetting?: boolean;
}

interface BettingPaymentScreenProps {
  onPaymentComplete: (lobby: Lobby, isHost: boolean) => void;
  onCancel: () => void;
  gameType: 'uno' | 'chess' | 'pool';
  betAmount: string;
  mode: 'create' | 'join';
  lobbyToJoin?: Lobby;
}

type PaymentStatus = 'waiting' | 'processing' | 'completed' | 'failed' | 'timeout' | 'waiting_for_player';

const BettingPaymentScreen: React.FC<BettingPaymentScreenProps> = ({
  onPaymentComplete,
  onCancel,
  gameType,
  betAmount,
  mode,
  lobbyToJoin
}) => {
  const { createService, account, isConnected } = useGameBetting();
  const { username, arcBalance } = useWeb3();
  const { toast } = useToast();
  const { createBettingLobby, joinBettingLobby, onBettingLobbyJoined } = useFirebaseBetting();
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('waiting');
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes timeout
  const [statusMessage, setStatusMessage] = useState('Initializing payment...');
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false);
  const [approvalCompleted, setApprovalCompleted] = useState(false);

  const currentUserId = account || `guest-${Date.now()}`;
  const currentUserName = username || 'Anonymous';

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
      case 'pool':
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

  // Listen for lobby updates when creating
  useEffect(() => {
    if (mode === 'create' && currentLobby) {
      const unsubscribe = onBettingLobbyJoined((lobby) => {
        if (lobby.id === currentLobby.id && lobby.player2Id) {
          console.log('🎯 [BETTING PAYMENT] Player 2 joined lobby:', lobby);
          setPaymentStatus('completed');
          setStatusMessage('Opponent found! Starting game...');
          setProgress(100);
          
          setTimeout(() => {
            onPaymentComplete(lobby, true);
          }, 1500);
        }
      });
      
      return unsubscribe;
    }
  }, [mode, currentLobby, onBettingLobbyJoined, onPaymentComplete]);

  // Payment processing
  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessedPayment) return;
    
    const processPayment = async () => {
      if (!account) {
        setStatusMessage('Please connect your wallet to continue.');
        return;
      }

      if (parseFloat(arcBalance || '0') < parseFloat(betAmount)) {
        setPaymentStatus('failed');
        setStatusMessage(`Insufficient balance. You need ${betAmount} ARC tokens.`);
        return;
      }

      setHasProcessedPayment(true);

      try {
        setStatusMessage('Preparing transaction...');
        setProgress(10);
        
        const service = await createService();
        setStatusMessage('Checking token allowance...');
        setProgress(25);
        
        const hasAllowance = await service.checkAllowance(account, betAmount);
        if (!hasAllowance && !approvalCompleted) {
          setStatusMessage('Requesting token approval...');
          setProgress(40);
          setPaymentStatus('processing');
          
          const approveTx = await service.approveTokens(betAmount);
          setTxHash(approveTx.hash);
          setStatusMessage('Waiting for approval confirmation...');
          setProgress(55);
          await approveTx.wait();
          
          // Mark approval as completed
          setApprovalCompleted(true);
          setStatusMessage('Approval confirmed! Proceeding with bet...');
          setProgress(60);
        }
        
        if (mode === 'create') {
          setPaymentStatus('processing');
          setStatusMessage('Creating lobby...');
          setProgress(65);
          const lobby = await createBettingLobby(gameType, currentUserName, currentUserId, betAmount);
          setCurrentLobby(lobby);
          
          setStatusMessage('Creating blockchain bet...');
          setProgress(80);
          const createBetTx = await service.createBet(betAmount, gameType, lobby.id);
          setTxHash(createBetTx.hash);
          setStatusMessage('Confirming bet transaction...');
          setProgress(90);
          await createBetTx.wait();
          
          setStatusMessage('Lobby created! Waiting for opponent...');
          setProgress(100);
          setPaymentStatus('waiting_for_player');
          
        } else if (mode === 'join' && lobbyToJoin) {
          setPaymentStatus('processing');
          setStatusMessage('Joining blockchain bet...');
          setProgress(70);
          const joinBetTx = await service.joinBet(lobbyToJoin.id);
          setTxHash(joinBetTx.hash);
          setStatusMessage('Confirming bet transaction...');
          setProgress(85);
          await joinBetTx.wait();
          
          setStatusMessage('Joining lobby...');
          setProgress(95);
          await joinBettingLobby(lobbyToJoin.id, currentUserName, currentUserId);
          
          setStatusMessage('Successfully joined! Starting game...');
          setProgress(100);
          setPaymentStatus('completed');
          
          setTimeout(() => {
            onPaymentComplete(lobbyToJoin, false);
          }, 1500);
        }
        
      } catch (error: any) {
        console.error('🚨 [BETTING PAYMENT] Payment error:', error);
        console.error('🚨 [BETTING PAYMENT] Error details:', {
          message: error.message,
          code: error.code,
          reason: error.reason,
          stack: error.stack
        });
        setPaymentStatus('failed');
        setStatusMessage(error.message || 'Payment failed. Please try again.');
        setProgress(0);
        setHasProcessedPayment(false); // Allow retry on error
        setApprovalCompleted(false); // Reset approval state on error
      }
    };

    // Start payment process immediately
    processPayment();
  }, [account, betAmount, hasProcessedPayment]);

  // Timeout timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1 && paymentStatus !== 'completed' && paymentStatus !== 'waiting_for_player') {
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
      case 'waiting_for_player':
        return <Users className="w-16 h-16 animate-pulse" />;
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

        {/* Betting Amount */}
        <div className={`text-2xl md:text-3xl font-bold ${theme.accent}`}>
          {mode === 'create' ? 'Create Bet:' : 'Join Bet:'} {betAmount} ARC
        </div>

        {/* Lobby ID for waiting state */}
        {paymentStatus === 'waiting_for_player' && currentLobby && (
          <div className="text-lg">
            <div className="text-white/70 mb-2">Lobby ID:</div>
            <div className={`font-mono text-xl ${theme.accent}`}>{currentLobby.id}</div>
          </div>
        )}

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
        {(paymentStatus === 'waiting' || paymentStatus === 'processing') && (
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
            Please confirm the transaction in your wallet. {mode === 'create' ? 'The lobby will be created' : 'You will join the lobby'} once payment is confirmed on the blockchain.
          </div>
        )}
        
        {paymentStatus === 'processing' && (
          <div className="text-sm opacity-75 max-w-sm">
            Transaction submitted! Waiting for blockchain confirmation. This may take a few moments.
          </div>
        )}
        
        {paymentStatus === 'waiting_for_player' && (
          <div className="text-sm opacity-75 max-w-sm">
            Your betting lobby has been created successfully! Share the lobby ID with your opponent or wait for someone to join.
          </div>
        )}
      </div>
    </div>
  );
};

export default BettingPaymentScreen;