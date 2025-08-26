"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trophy, AlertCircle, CheckCircle } from 'lucide-react';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { SimpleGambleManager, SimpleGambleGame, HOUSE_FEE_PERCENT } from '@/lib/simple-gamble';
import { MultiplayerUnoClient } from './MultiplayerUnoClient';
import { ethers } from 'ethers';

interface SimpleGambleClientProps {
  game: SimpleGambleGame;
  isHost: boolean;
  onGameEnd: () => void;
}

type GameState = 'waiting_payments' | 'ready_to_play' | 'playing' | 'game_ended' | 'payout_processing' | 'completed';

export const SimpleGambleClient = ({ game, isHost, onGameEnd }: SimpleGambleClientProps) => {
  const [gameState, setGameState] = useState<GameState>('waiting_payments');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [payoutTxHash, setPayoutTxHash] = useState('');
  const [gameResult, setGameResult] = useState<any>(null);
  
  const { account } = useWeb3();

  // Monitor game state
  useEffect(() => {
    const checkGameState = () => {
      if (SimpleGambleManager.isGameReady(game.id)) {
        if (gameState === 'waiting_payments') {
          setGameState('ready_to_play');
          // Auto-start game after a short delay
          setTimeout(() => {
            setGameState('playing');
          }, 2000);
        }
      }
    };

    const interval = setInterval(checkGameState, 1000);
    return () => clearInterval(interval);
  }, [game.id, gameState]);

  const handleGameEnd = async (result?: {
    winnerId: string;
    winnerName: string;
    winnerAddress: string;
    loserId: string;
    loserName: string;
    loserAddress: string;
  }) => {
    if (!result) {
      console.error('❌ [SIMPLE GAMBLE] No game result provided');
      setGameState('completed');
      onGameEnd();
      return;
    }

    setGameResult(result);
    setGameState('game_ended');
    
    // Complete the game in memory
    SimpleGambleManager.completeGame(game.id, result.winnerAddress, result.winnerName);
    
    // Process payout
    await processPayout(result);
  };

  const processPayout = async (result: any) => {
    setGameState('payout_processing');
    setIsProcessing(true);
    setError('');

    try {
      console.log('💰 [SIMPLE GAMBLE] Processing payout for winner:', result.winnerName);
      
      const response = await fetch('/api/simple-gamble-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: game.id,
          winnerAddress: result.winnerAddress,
          winnerName: result.winnerName,
          totalPot: game.totalPot
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payout failed');
      }

      const payoutResult = await response.json();
      console.log('✅ [SIMPLE GAMBLE] Payout completed:', payoutResult);
      
      setPayoutTxHash(payoutResult.payoutTxHash);
      setGameState('completed');
      
    } catch (error: any) {
      console.error('❌ [SIMPLE GAMBLE] Payout failed:', error);
      setError(error.message || 'Payout processing failed');
      setGameState('completed');
    } finally {
      setIsProcessing(false);
      
      // Delay before calling onGameEnd to show result
      setTimeout(() => {
        onGameEnd();
      }, 5000);
    }
  };

  // Render different states
  if (gameState === 'waiting_payments') {
    return (
      <div className="w-full max-w-2xl mx-auto text-center space-y-6">
        <Card className="bg-black/50 border-yellow-400/30">
          <CardHeader>
            <CardTitle className="text-yellow-400">Waiting for Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="animate-pulse">
              <Loader2 className="w-16 h-16 text-yellow-400 mx-auto animate-spin" />
            </div>
            
            <div className="bg-blue-600/20 rounded-lg p-4 border border-blue-400/30">
              <h3 className="text-blue-400 font-semibold mb-2">Game Details</h3>
              <div className="space-y-1 text-sm">
                <p className="text-white/70">Player 1: {game.player1Name}</p>
                <p className="text-white/70">Player 2: {game.player2Name || 'Waiting...'}</p>
                <p className="text-white/70">Bet Amount: {game.betAmount} ARC each</p>
                <p className="text-white/70">Total Pot: {game.totalPot} ARC</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-black/30 rounded p-2">
                <span className="text-white/70">Player 1 Payment:</span>
                <div className="flex items-center gap-2">
                  {SimpleGambleManager.getPlayerPaymentStatus(game.id, game.player1).sPaid ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                  )}
                  <span className="text-sm">S Fee</span>
                  {SimpleGambleManager.getPlayerPaymentStatus(game.id, game.player1).arcPaid ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                  )}
                  <span className="text-sm">ARC</span>
                </div>
              </div>
              
              {game.player2 && (
                <div className="flex items-center justify-between bg-black/30 rounded p-2">
                  <span className="text-white/70">Player 2 Payment:</span>
                  <div className="flex items-center gap-2">
                    {SimpleGambleManager.getPlayerPaymentStatus(game.id, game.player2).sPaid ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                    )}
                    <span className="text-sm">S Fee</span>
                    {SimpleGambleManager.getPlayerPaymentStatus(game.id, game.player2).arcPaid ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                    )}
                    <span className="text-sm">ARC</span>
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-white/70 text-sm">
              Waiting for both players to complete their payments...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'ready_to_play') {
    return (
      <div className="w-full max-w-2xl mx-auto text-center space-y-6">
        <Card className="bg-black/50 border-green-400/30">
          <CardContent className="p-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-4">Both Players Paid!</h3>
            <div className="bg-green-600/20 rounded-lg p-4 border border-green-400/30 mb-4">
              <p className="text-green-400 font-semibold">🎮 Starting UNO Gamble Game...</p>
              <p className="text-white/70 text-sm mt-2">Winner takes {((parseFloat(game.totalPot)) * (100 - HOUSE_FEE_PERCENT) / 100).toFixed(2)} ARC</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'playing') {
    // Convert SimpleGambleGame to the format expected by MultiplayerUnoClient
    const lobbyForUno = {
      id: game.id,
      gameType: 'uno' as const,
      player1Id: game.player1,
      player1Name: game.player1Name,
      player2Id: game.player2 || '',
      player2Name: game.player2Name || '',
      status: 'playing' as const,
      createdAt: game.createdAt,
      isGamble: true,
      betAmount: game.betAmount
    };

    return (
      <MultiplayerUnoClient
        lobby={lobbyForUno}
        isHost={isHost}
        onGameEnd={handleGameEnd}
      />
    );
  }

  if (gameState === 'game_ended' || gameState === 'payout_processing' || gameState === 'completed') {
    const isWinner = gameResult && account && gameResult.winnerAddress.toLowerCase() === account.toLowerCase();
    const winnerPayout = ((parseFloat(game.totalPot)) * (100 - HOUSE_FEE_PERCENT) / 100).toFixed(2);
    
    return (
      <div className="w-full max-w-2xl mx-auto text-center space-y-6">
        <Card className={`bg-black/50 border-${isWinner ? 'green' : 'red'}-400/30`}>
          <CardHeader>
            <CardTitle className={`text-${isWinner ? 'green' : 'red'}-400 flex items-center justify-center gap-2`}>
              <Trophy className="w-6 h-6" />
              {isWinner ? 'You Won!' : 'You Lost!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gameResult && (
              <div className="bg-blue-600/20 rounded-lg p-4 border border-blue-400/30">
                <h3 className="text-blue-400 font-semibold mb-2">Game Results</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-white/70">Winner: {gameResult.winnerName}</p>
                  <p className="text-white/70">Total Pot: {game.totalPot} ARC</p>
                  <p className="text-white/70">Winner Gets: {winnerPayout} ARC</p>
                  <p className="text-white/70">House Fee: {HOUSE_FEE_PERCENT}%</p>
                </div>
              </div>
            )}
            
            {gameState === 'payout_processing' && (
              <div className="bg-yellow-600/20 rounded-lg p-4 border border-yellow-400/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-yellow-400 font-semibold">Processing Payout...</span>
                </div>
                <p className="text-white/70 text-sm">Sending {winnerPayout} ARC to winner...</p>
              </div>
            )}
            
            {gameState === 'completed' && payoutTxHash && (
              <div className="bg-green-600/20 rounded-lg p-4 border border-green-400/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-green-400 font-semibold">Payout Completed!</span>
                </div>
                <p className="text-white/70 text-sm mb-2">{winnerPayout} ARC sent to winner</p>
                <a 
                  href={`https://sonicscan.org/tx/${payoutTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-xs break-all"
                >
                  View Transaction: {payoutTxHash}
                </a>
              </div>
            )}
            
            {error && (
              <div className="bg-red-600/20 rounded-lg p-4 border border-red-400/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-red-400 font-semibold">Error</span>
                </div>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            <p className="text-white/70 text-sm">
              {gameState === 'completed' ? 'Returning to lobby in a few seconds...' : 'Please wait...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};