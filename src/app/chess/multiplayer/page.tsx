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
}

export default function ChessMultiplayerPage() {
  const [currentView, setCurrentView] = useState<'lobby' | 'game'>('lobby');
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [isHost, setIsHost] = useState(false);

  const handleStartGame = (lobby: Lobby, isHostPlayer: boolean) => {
    console.log('🎮 [CHESS MULTIPLAYER PAGE] handleStartGame called with:', {
      lobby: lobby,
      isHostPlayer: isHostPlayer,
      currentView: currentView
    });
    
    setCurrentLobby(lobby);
    setIsHost(isHostPlayer);
    setCurrentView('game');
    
    console.log('🔄 [CHESS MULTIPLAYER PAGE] State updated - should transition to game view');
  };

  const handleBackToLobby = () => {
    setCurrentView('lobby');
    setCurrentLobby(null);
    setIsHost(false);
  };

  const handleBackToChess = () => {
    window.location.href = '/chess/singleplayer';
  };

  console.log('🖥️ [CHESS MULTIPLAYER PAGE] Render - currentView:', currentView, 'currentLobby:', currentLobby, 'isHost:', isHost);
  
  if (currentView === 'game' && currentLobby) {
    console.log('✅ [CHESS MULTIPLAYER PAGE] Conditions met, rendering MultiplayerChessClient');
    console.log('🔍 [CHESS MULTIPLAYER PAGE] Lobby data being passed:', {
      id: currentLobby.id,
      status: currentLobby.status,
      player1Id: currentLobby.player1Id,
      player1Name: currentLobby.player1Name,
      player2Id: currentLobby.player2Id,
      player2Name: currentLobby.player2Name,
      hasPlayer2: !!currentLobby.player2Id
    });
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
  
  console.log('🏠 [CHESS MULTIPLAYER PAGE] Rendering lobby view');

  return (
    <div className="w-full h-screen bg-chess-background flex items-center justify-center overflow-hidden">
      <MultiplayerLobby
        gameType="chess"
        onStartGame={handleStartGame}
        onBackToMenu={handleBackToChess}
      />
    </div>
  );
}