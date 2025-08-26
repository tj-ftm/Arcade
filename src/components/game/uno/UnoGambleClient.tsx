"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, DollarSign, Users, Trophy, AlertCircle } from 'lucide-react';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { unoGambleContract, type UnoGambleGame } from '@/lib/uno-gamble';
import { MultiplayerUnoClient } from './MultiplayerUnoClient';
import { ethers } from 'ethers';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
  betAmount?: string;
  contractAddress?: string;
}

interface UnoGambleClientProps {
  lobby: Lobby;
  isHost: boolean;
  onGameEnd: () => void;
}

type GambleState = 'setup' | 'waiting_payment' | 'payment_progress' | 'ready_to_play' | 'playing' | 'completed';

export const UnoGambleClient = ({ lobby, isHost, onGameEnd }: UnoGambleClientProps) => {
  const { account, getSigner } = useWeb3();
  const [gambleState, setGambleState] = useState<GambleState>('setup');
  const [betAmount, setBetAmount] = useState<string>('1');
  const [contractAddress, setContractAddress] = useState<string>('');
  const [gameInfo, setGameInfo] = useState<UnoGambleGame | null>(null);
  const [playerBalance, setPlayerBalance] = useState<string>('0');
  const [paymentProgress, setPaymentProgress] = useState<{
    player1Paid: boolean;
    player2Paid: boolean;
    player1TxHash?: string;
    player2TxHash?: string;
  }>({ player1Paid: false, player2Paid: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentTxHash, setCurrentTxHash] = useState<string>('');

  // Initialize contract and check player balance
  useEffect(() => {
    if (account) {
      refreshBalance();
    }
  }, [account]);

  // Poll for payment status
  useEffect(() => {
    if (gambleState === 'payment_progress' && contractAddress) {
      const interval = setInterval(checkPaymentStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [gambleState, contractAddress]);

  const initializeGambling = async () => {
    try {
      if (!account) return;
      
      const signer = await getSigner();
      if (!signer) return;
      
      // Get player's ARC balance
      const balance = await unoGambleContract.getPlayerBalance(account);
      setPlayerBalance(balance);
      
      // If lobby already has contract address, initialize with it
      if (lobby.contractAddress) {
        setContractAddress(lobby.contractAddress);
        await unoGambleContract.initialize(signer, lobby.contractAddress);
        setGambleState('payment_progress');
        checkPaymentStatus();
      }
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Initialization failed:', error);
      setError('Failed to initialize gambling system');
    }
  };

  const createGamblingGame = async () => {
    if (!account || !lobby.player2Id) {
      setError('Missing required information');
      return;
    }

    const signer = await getSigner();
    if (!signer) {
      setError('Failed to get wallet signer');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      console.log('🎮 [UNO GAMBLE] Creating gambling game...');
      
      // Deploy new contract for this game
      const newContractAddress = await unoGambleContract.deployGameContract();
      await unoGambleContract.initialize(signer, newContractAddress);
      
      // Create the gambling game
      const result = await unoGambleContract.createGame(
        lobby.id,
        lobby.player1Id,
        lobby.player2Id,
        betAmount
      );
      
      setContractAddress(result.contractAddress);
      setCurrentTxHash(result.txHash);
      setGambleState('waiting_payment');
      
      console.log('✅ [UNO GAMBLE] Game created successfully:', result);
      
    } catch (error: any) {
      console.error('❌ [UNO GAMBLE] Game creation failed:', error);
      setError(error.message || 'Failed to create gambling game');
    } finally {
      setIsProcessing(false);
    }
  };

  const payBet = async () => {
    if (!account) {
      setError('Wallet not connected');
      return;
    }

    const signer = await getSigner();
    if (!signer) {
      setError('Failed to get wallet signer');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      console.log('💰 [UNO GAMBLE] Processing bet payment...');
      
      // First approve tokens
      const approvalTx = await unoGambleContract.approveTokens(betAmount);
      if (approvalTx) {
        setCurrentTxHash(approvalTx);
        console.log('🔓 [UNO GAMBLE] Tokens approved:', approvalTx);
      }
      
      // Then pay the bet
      const paymentResult = await unoGambleContract.payBet(lobby.id);
      
      if (paymentResult.success) {
        setCurrentTxHash(paymentResult.txHash);
        setGambleState('payment_progress');
        console.log('✅ [UNO GAMBLE] Bet paid successfully:', paymentResult.txHash);
      } else {
        throw new Error('Payment failed');
      }
      
    } catch (error: any) {
      console.error('❌ [UNO GAMBLE] Payment failed:', error);
      setError(error.message || 'Failed to pay bet');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!contractAddress || !lobby.player2Id) return;

    try {
      const player1Paid = await unoGambleContract.hasPlayerPaid(lobby.id, lobby.player1Id);
      const player2Paid = await unoGambleContract.hasPlayerPaid(lobby.id, lobby.player2Id);
      
      setPaymentProgress({
        player1Paid,
        player2Paid,
        player1TxHash: player1Paid ? 'confirmed' : undefined,
        player2TxHash: player2Paid ? 'confirmed' : undefined
      });
      
      // Check if game is ready to start
      if (player1Paid && player2Paid) {
        const isReady = await unoGambleContract.isGameReady(lobby.id);
        if (isReady) {
          setGambleState('ready_to_play');
        }
      }
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to check payment status:', error);
    }
  };

  const startGame = () => {
    setGambleState('playing');
  };

  const handleGameEnd = async (gameResult?: {
    winnerId: string;
    winnerName: string;
    winnerAddress: string;
    loserId: string;
    loserName: string;
    loserAddress: string;
  }) => {
    if (!gameResult || !lobby.contractAddress) {
      console.error('❌ [UNO GAMBLE] Missing game result or contract info');
      setGambleState('completed');
      onGameEnd();
      return;
    }

    const signer = await getSigner();
    if (!signer) {
      console.error('❌ [UNO GAMBLE] Failed to get wallet signer');
      setGambleState('completed');
      onGameEnd();
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      
      console.log('🏆 [UNO GAMBLE] Processing game result:', gameResult);
      
      // Initialize contract with the lobby's contract address
      await unoGambleContract.initialize(signer, lobby.contractAddress);
      
      // Create result data string with game information
      const resultData = JSON.stringify({
        gameId: lobby.id,
        winnerId: gameResult.winnerId,
        winnerName: gameResult.winnerName,
        winnerAddress: gameResult.winnerAddress,
        loserId: gameResult.loserId,
        loserName: gameResult.loserName,
        loserAddress: gameResult.loserAddress,
        timestamp: Date.now(),
        gameType: 'uno'
      });
      
      // Verify game result and trigger payout
      const verificationTxHash = await unoGambleContract.verifyGameResult(
        lobby.id,
        gameResult.winnerAddress,
        resultData
      );
      
      setCurrentTxHash(verificationTxHash);
      
      console.log('✅ [UNO GAMBLE] Game result verified and payout processed:', verificationTxHash);
      
      // Show success message
      setError('');
      
    } catch (error: any) {
      console.error('❌ [UNO GAMBLE] Failed to process game result:', error);
      setError(`Failed to process game result: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setGambleState('completed');
      
      // Delay before calling onGameEnd to show result
      setTimeout(() => {
        onGameEnd();
      }, 3000);
    }
  };

  // Render different states
  if (gambleState === 'playing') {
    return (
      <MultiplayerUnoClient
        lobby={lobby}
        isHost={isHost}
        onGameEnd={handleGameEnd}
      />
    );
  }
  
  if (gambleState === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/50 border-yellow-400/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-yellow-400 mb-2">
              {isProcessing ? 'Processing Payout...' : 'Game Completed!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isProcessing ? (
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-yellow-400" />
                <p className="text-white">Verifying game result and processing payout...</p>
                {currentTxHash && (
                  <div className="bg-black/30 rounded-lg p-3 border border-yellow-400/30">
                    <p className="text-yellow-400 font-semibold text-sm mb-1">Payout Transaction:</p>
                    <p className="text-white/70 text-xs break-all">
                      {currentTxHash.slice(0, 10)}...{currentTxHash.slice(-8)}
                    </p>
                    <a 
                      href={`https://sonicscan.org/tx/${currentTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-yellow-300 text-xs underline mt-1 inline-block"
                    >
                      View on Sonic Explorer
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4">
                <Trophy className="h-12 w-12 mx-auto text-yellow-400" />
                <p className="text-white">Game result has been verified and payout processed!</p>
                <p className="text-white/70 text-sm">
                  Winner receives {((parseFloat(lobby.betAmount || '0') * 2) * 0.95).toFixed(2)} ARC
                </p>
                {currentTxHash && (
                  <div className="bg-green-600/20 rounded-lg p-3 border border-green-400/30">
                    <p className="text-green-400 font-semibold text-sm mb-1">✅ Payout Completed</p>
                    <a 
                      href={`https://sonicscan.org/tx/${currentTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 text-xs underline"
                    >
                      View Transaction
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <div className="bg-red-600/20 rounded-lg p-3 border border-red-400/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-headline text-accent uppercase tracking-wider mb-2">
          UNO GAMBLE
        </h1>
        <p className="text-white/70 text-lg">
          High-stakes UNO with on-chain betting
        </p>
      </div>

      {/* Player Info */}
      <Card className="bg-black/50 border-yellow-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Users className="h-5 w-5" />
            Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-white font-semibold">{lobby.player1Name}</p>
              <p className="text-white/60 text-sm">{lobby.player1Id.slice(0, 8)}...</p>
              {paymentProgress.player1Paid && (
                <div className="text-green-400 text-sm mt-1">✅ Paid</div>
              )}
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">{lobby.player2Name || 'Waiting...'}</p>
              <p className="text-white/60 text-sm">
                {lobby.player2Id ? `${lobby.player2Id.slice(0, 8)}...` : 'No player'}
              </p>
              {paymentProgress.player2Paid && (
                <div className="text-green-400 text-sm mt-1">✅ Paid</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Betting Setup */}
      {gambleState === 'setup' && (
        <Card className="bg-black/50 border-yellow-400/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <DollarSign className="h-5 w-5" />
              Set Bet Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-white mb-2">Bet Amount (ARC)</label>
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                min="0.1"
                step="0.1"
                className="bg-black/30 border-yellow-400/30 text-white"
                placeholder="Enter bet amount"
              />
            </div>
            
            <div className="text-sm text-white/70">
              <p>Your ARC Balance: {playerBalance} ARC</p>
              <p>House Fee: 5% of total pot</p>
              <p>Gas Fee: 0.05 S (paid once by host)</p>
            </div>
            
            {parseFloat(betAmount) > parseFloat(playerBalance) && (
              <div className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Insufficient ARC balance
              </div>
            )}
            
            <Button
              onClick={createGamblingGame}
              disabled={isProcessing || !lobby.player2Id || parseFloat(betAmount) > parseFloat(playerBalance)}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Game...</>
              ) : (
                `Create Gambling Game (${betAmount} ARC each)`
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Phase */}
      {(gambleState === 'waiting_payment' || gambleState === 'payment_progress') && (
        <Card className="bg-black/50 border-yellow-400/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <DollarSign className="h-5 w-5" />
              Payment Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-white text-lg mb-2">Bet Amount: {betAmount} ARC each</p>
              <p className="text-white/70">Total Pot: {(parseFloat(betAmount) * 2).toFixed(2)} ARC</p>
              <p className="text-white/70">Winner Gets: {((parseFloat(betAmount) * 2) * 0.95).toFixed(2)} ARC (after 5% house fee)</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white">{lobby.player1Name}</span>
                <span className={`text-sm ${paymentProgress.player1Paid ? 'text-green-400' : 'text-yellow-400'}`}>
                  {paymentProgress.player1Paid ? '✅ Paid' : '⏳ Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white">{lobby.player2Name}</span>
                <span className={`text-sm ${paymentProgress.player2Paid ? 'text-green-400' : 'text-yellow-400'}`}>
                  {paymentProgress.player2Paid ? '✅ Paid' : '⏳ Pending'}
                </span>
              </div>
            </div>
            
            <Progress 
              value={((paymentProgress.player1Paid ? 1 : 0) + (paymentProgress.player2Paid ? 1 : 0)) * 50} 
              className="w-full"
            />
            
            {!paymentProgress[account === lobby.player1Id ? 'player1Paid' : 'player2Paid'] && (
              <Button
                onClick={payBet}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Payment...</>
                ) : (
                  `Pay Bet (${betAmount} ARC)`
                )}
              </Button>
            )}
            
            {currentTxHash && (
              <div className="text-center">
                <p className="text-white/70 text-sm">Transaction:</p>
                <a 
                  href={`https://sonicscan.org/tx/${currentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm break-all"
                >
                  {currentTxHash}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ready to Play */}
      {gambleState === 'ready_to_play' && (
        <Card className="bg-black/50 border-green-400/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Trophy className="h-5 w-5" />
              Ready to Play!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-white text-lg">Both players have paid their bets!</p>
            <p className="text-white/70">Total pot: {(parseFloat(betAmount) * 2).toFixed(2)} ARC</p>
            <p className="text-white/70">Winner takes: {((parseFloat(betAmount) * 2) * 0.95).toFixed(2)} ARC</p>
            
            <Button
              onClick={startGame}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-xl py-6"
            >
              START UNO GAMBLE!
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/50 border-red-400/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};