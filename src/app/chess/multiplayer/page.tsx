"use client";

import { useState } from 'react';
import { MultiplayerLobby } from '@/components/game/MultiplayerLobby';
import { MultiplayerChessClient } from '@/components/game/chess/MultiplayerChessClient';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any; // Firebase timestamp
  player1Color?: 'white' | 'black';
  player2Color?: 'white' | 'black';
}

export default function ChessMultiplayerPage() {
  const [currentView, setCurrentView] = useState<'lobby' | 'game'>('lobby');
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [isHost, setIsHost] = useState(false);

  const handleStartGame = (lobby: Lobby, isHostPlayer: boolean) => {
    console.log('handleStartGame called with:', { lobby, isHostPlayer });
    setCurrentLobby(lobby);
    setIsHost(isHostPlayer);
    setCurrentView('game');
    console.log('State updated - currentView should be game');
  };

  const handleBackToLobby = () => {
    setCurrentView('lobby');
    setCurrentLobby(null);
    setIsHost(false);
  };

  const handleBackToChess = () => {
    window.location.href = '/chess/singleplayer';
  };

  console.log('Render - currentView:', currentView, 'currentLobby:', currentLobby);
  
  if (currentView === 'game' && currentLobby) {
    console.log('Rendering MultiplayerChessClient');
    return (
      <div className="w-full h-screen">
        <MultiplayerChessClient
          lobby={currentLobby}
          isHost={isHost}
          onGameEnd={handleBackToLobby}
        />
      </div>
    );
  }

  console.log('Rendering MultiplayerLobby');
  return (
    <div className="w-full h-screen bg-purple-800 bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900 flex items-center justify-center overflow-hidden">
      <MultiplayerLobby
        gameType="chess"
        onStartGame={handleStartGame}
        onBackToMenu={handleBackToChess}
      />
    </div>
  );
}