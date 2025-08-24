"use client";

import { useState } from 'react';
import { MultiplayerLobby } from '@/components/game/MultiplayerLobby';
import { MultiplayerUnoClient } from '@/components/game/uno/MultiplayerUnoClient';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  hostId: string;
  hostName: string;
  playerId?: string;
  playerName?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  player1Color?: 'white' | 'black';
  player2Color?: 'white' | 'black';
}

export default function UnoMultiplayerPage() {
  const [currentView, setCurrentView] = useState<'lobby' | 'game'>('lobby');
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [isHost, setIsHost] = useState(false);

  const handleStartGame = (lobby: Lobby, isHostPlayer: boolean) => {
    setCurrentLobby(lobby);
    setIsHost(isHostPlayer);
    setCurrentView('game');
  };

  const handleBackToLobby = () => {
    setCurrentView('lobby');
    setCurrentLobby(null);
    setIsHost(false);
  };

  const handleBackToUno = () => {
    window.location.href = '/singleplayer';
  };

  if (currentView === 'game' && currentLobby) {
    return (
      <div className="w-full h-screen">
        <MultiplayerUnoClient
          lobby={currentLobby}
          isHost={isHost}
          onGameEnd={handleBackToLobby}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 flex items-center justify-center overflow-hidden">
      <MultiplayerLobby
        gameType="uno"
        onStartGame={handleStartGame}
        onBackToMenu={handleBackToUno}
      />
    </div>
  );
}