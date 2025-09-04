"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, Clock, Users, ArrowLeft } from 'lucide-react';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { useToast } from '@/hooks/use-toast';
import { ethers } from 'ethers';

// Simple betting system using direct wallet payments
const GAME_WALLET_ADDRESS = '0x5AD5aE34265957fB08eA12f77BAFf1200060473e';
const ARC_TOKEN_ADDRESS = '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d';
const S_FEE = '0.05'; // 0.05 S fee per player
const HOUSE_FEE_PERCENT = 5; // 5% house edge

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

interface SimpleBettingPaymentProps {
  onPaymentComplete: (lobby: Lobby, isHost: boolean) => void;
  onCancel: () => void;
  gameType: 'uno' | 'chess' | 'pool';
  betAmount: string;
  mode: 'create' | 'join';
  lobbyToJoin?: Lobby;
}

type PaymentStatus = 'waiting' | 'paying_fee' | 'paying_bet' | 'completed' | 'failed' | 'waiting_for_player';

const ARC_TOKEN_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)'
];

const SimpleBettingPayment: React.FC<SimpleBettingPaymentProps> = ({
  onPaymentComplete,
  onCancel,
  gameType,
  betAmount,
  mode,
  lobbyToJoin
}) => {
  const { account, isConnected, getProvider, getSigner, arcBalance } = useWeb3();
  const { toast } = useToast();
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('waiting');
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes timeout
  const [statusMessage, setStatusMessage] = useState('Initializing payment...');
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false);

  const currentUserId = account || `guest-${Date.now()}`;
  const currentUserName = account?.slice(0, 8) + '...' || 'Anonymous';

  // Start payment process
  useEffect(() => {
    if (!hasProcessedPayment && account && isConnected) {
      processSimplePayment();
    }
  }, [account, isConnected, hasProcessedPayment]);

  // Timeout timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1 && paymentStatus !== 'completed' && paymentStatus !== 'waiting_for_player') {
          setPaymentStatus('failed');
          setStatusMessage('Payment timeout. Please try again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentStatus]);

  const processSimplePayment = async () => {
    if (!account || !isConnected) {
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
      const provider = getProvider();
      const signer = getSigner();
      
      if (!provider || !signer) {
        throw new Error('Wallet not connected');
      }

      // Step 1: Pay S fee to game wallet
      setPaymentStatus('paying_fee');
      setStatusMessage(`Paying ${S_FEE} S fee to game wallet...`);
      setProgress(20);
      
      const feeTx = await signer.sendTransaction({
        to: GAME_WALLET_ADDRESS,
        value: ethers.parseEther(S_FEE),
        gasLimit: 21000
      });
      
      setTxHash(feeTx.hash);
      setStatusMessage('Waiting for fee confirmation...');
      setProgress(40);
      await feeTx.wait();
      
      // Step 2: Pay ARC bet to game wallet
      setPaymentStatus('paying_bet');
      setStatusMessage(`Paying ${betAmount} ARC bet to game wallet...`);
      setProgress(60);
      
      const arcToken = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI, signer);
      const betAmountWei = ethers.parseEther(betAmount);
      
      // Check allowance first
      const allowance = await arcToken.allowance(account, GAME_WALLET_ADDRESS);
      if (allowance < betAmountWei) {
        setStatusMessage('Approving ARC tokens...');
        const approveTx = await arcToken.approve(GAME_WALLET_ADDRESS, betAmountWei);
        await approveTx.wait();
      }
      
      // Transfer ARC to game wallet
      const betTx = await arcToken.transfer(GAME_WALLET_ADDRESS, betAmountWei);
      setTxHash(betTx.hash);
      setStatusMessage('Waiting for bet confirmation...');
      setProgress(80);
      await betTx.wait();
      
      if (mode === 'create') {
        // Create lobby - bypass Firebase, use direct game start
        setStatusMessage('Payment completed! Starting game...');
        setProgress(100);
        setPaymentStatus('completed');
        
        const newLobby: Lobby = {
          id: `SIMPLE-BET-${gameType.toUpperCase()}-${Date.now()}`,
          gameType,
          player1Id: currentUserId,
          player1Name: currentUserName,
          status: 'playing',
          createdAt: Date.now(),
          betAmount,
          isBetting: true
        };
        
        // For direct wallet payments, skip lobby waiting and start game immediately
        setTimeout(() => {
          onPaymentComplete(newLobby, true);
        }, 1500);
        
      } else if (mode === 'join' && lobbyToJoin) {
        setStatusMessage('Joining lobby...');
        setProgress(95);
        
        const updatedLobby = {
          ...lobbyToJoin,
          player2Id: currentUserId,
          player2Name: currentUserName,
          status: 'playing' as const
        };
        
        setStatusMessage('Successfully joined! Starting game...');
        setProgress(100);
        setPaymentStatus('completed');
        
        setTimeout(() => {
          onPaymentComplete(updatedLobby, false);
        }, 1500);
      }
      
    } catch (error: any) {
      console.error('Simple betting payment error:', error);
      setPaymentStatus('failed');
      setStatusMessage(error.message || 'Payment failed. Please try again.');
      setProgress(0);
      setHasProcessedPayment(false);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'waiting':
      case 'paying_fee':
      case 'paying_bet':
        return <Loader2 className="w-16 h-16 animate-spin" />;
      case 'waiting_for_player':
        return <Users className="w-16 h-16 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-16 h-16 text-green-400" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-400" />;
      default:
        return <Clock className="w-16 h-16" />;
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'waiting_for_player':
        return 'text-blue-400';
      default:
        return 'text-white';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4">
      <Card className="w-full max-w-md bg-black/50 border-white/20 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-headline uppercase tracking-wider">
            Simple Betting Payment
          </CardTitle>
          <div className="text-sm opacity-75">
            {mode === 'create' ? 'Creating' : 'Joining'} {gameType.toUpperCase()} Lobby
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>
          
          {/* Status Message */}
          <div className={`text-center text-lg font-semibold ${getStatusColor()}`}>
            {statusMessage}
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="text-center text-sm opacity-75">
              {progress}% Complete
            </div>
          </div>
          
          {/* Bet Details */}
          <div className="bg-black/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span>Game Type:</span>
              <span className="font-semibold">{gameType.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Bet Amount:</span>
              <span className="font-semibold">{betAmount} ARC</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee:</span>
              <span className="font-semibold">{S_FEE} S</span>
            </div>
            <div className="flex justify-between">
              <span>House Fee:</span>
              <span className="font-semibold">{HOUSE_FEE_PERCENT}%</span>
            </div>
            <div className="border-t border-white/20 pt-2 flex justify-between font-bold">
              <span>Winner Gets:</span>
              <span className="text-green-400">
                {(parseFloat(betAmount) * 2 * (100 - HOUSE_FEE_PERCENT) / 100).toFixed(2)} ARC
              </span>
            </div>
          </div>
          
          {/* Timer */}
          {paymentStatus !== 'completed' && paymentStatus !== 'failed' && (
            <div className="text-center">
              <div className="text-sm opacity-75">Time remaining:</div>
              <div className="text-xl font-mono">{formatTime(timeLeft)}</div>
            </div>
          )}
          
          {/* Transaction Hash */}
          {txHash && (
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-center mb-2">Transaction Hash:</div>
              <div className="bg-black/30 rounded p-2 font-mono text-xs break-all">
                {txHash}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            {(paymentStatus === 'failed' || paymentStatus === 'waiting') && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            
            {paymentStatus === 'failed' && (
              <Button
                onClick={() => {
                  setHasProcessedPayment(false);
                  setPaymentStatus('waiting');
                  setProgress(0);
                  setTxHash('');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500"
              >
                Retry Payment
              </Button>
            )}
          </div>
          
          {/* Payment Instructions */}
          {paymentStatus === 'waiting' && (
            <div className="text-sm opacity-75 text-center max-w-sm mx-auto">
              This system uses direct wallet payments to the game wallet. No smart contracts required!
            </div>
          )}
          
          {paymentStatus === 'waiting_for_player' && (
            <div className="text-sm opacity-75 text-center max-w-sm mx-auto">
              Your betting lobby has been created! Waiting for an opponent to join.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleBettingPayment;