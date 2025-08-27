"use client";

import { useState, useCallback } from 'react';
import PoolGameEngine from './PoolGameEngine';
import { PoolStartScreen } from '../PoolStartScreen';
import { PoolEndGameScreen } from '../PoolEndGameScreen';
import { useWeb3 } from '@/components/web3/Web3Provider';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno' | 'pool';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any; // Firebase timestamp
}

interface PoolClientProps {
  lobby?: Lobby | null; // Make lobby optional and allow null
  isHost: boolean;
  skipStartScreen?: boolean; // Skip start screen for betting games
  onGameEnd: (gameResult?: {
    winnerId: string;
    winnerName: string;
    winnerAddress: string;
    loserId: string;
    loserName: string;
    loserAddress: string;
  }) => void;
}

export const PoolClient = ({ lobby, isHost, skipStartScreen = false, onGameEnd }: PoolClientProps) => {
  const { username, account } = useWeb3();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'ended'>(skipStartScreen ? 'playing' : 'start');
  const [gameResult, setGameResult] = useState<any>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState('');
  const [tokensEarned, setTokensEarned] = useState(0);

  const handleStartGame = useCallback(() => {
    setGameState('playing');
  }, []);

  const handleGameEnd = useCallback((result?: any) => {
    setGameResult(result);
    setGameState('ended');
    if (result) {
      // For multiplayer games, pass the full result object
      // For single player, just pass a boolean
      if (lobby) {
        onGameEnd(result);
      } else {
        onGameEnd(result?.winnerId === account);
      }
    }
  }, [onGameEnd, lobby, account]);

  const handleNewGame = useCallback(() => {
    setGameState('start');
    setGameResult(null);
    setIsMinting(false);
    setMintTxHash('');
    setTokensEarned(0);
  }, []);

  const handleBackToMenu = useCallback(() => {
    onGameEnd();
  }, [onGameEnd]);

  // Determine game mode
  const gameMode = lobby ? 'multiplayer' : 'singleplayer';





  // Render different screens based on game state
  if (gameState === 'start') {
    return (
      <PoolStartScreen
        onStartGame={handleStartGame}
        onBackToMenu={handleBackToMenu}
        isMultiplayer={!!lobby}
        playerName={username || 'Player'}
        opponentName={lobby?.player2Name || 'AI'}
      />
    );
  }

  if (gameState === 'ended') {
    const hasWon = gameResult?.winnerId === account;
    return (
      <PoolEndGameScreen
        hasWon={hasWon}
        onNewGame={handleNewGame}
        onBackToMenu={handleBackToMenu}
        isMinting={isMinting}
        mintTxHash={mintTxHash}
        tokensEarned={tokensEarned}
        isMultiplayer={!!lobby}
      />
    );
  }

  // Render the main game
  return (
    <PoolGameEngine
      lobby={lobby}
      isHost={isHost}
      onGameEnd={handleGameEnd}
      gameMode={gameMode}
    />
  );
};