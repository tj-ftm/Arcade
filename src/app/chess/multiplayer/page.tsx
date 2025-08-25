"use client";

import { useState, useCallback, useEffect } from 'react';
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
  console.log('🚀 [CHESS MULTIPLAYER PAGE] Component function called - START OF COMPONENT');
  const [currentView, setCurrentView] = useState<'lobby' | 'game'>('lobby');
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    console.log('🏗️ [CHESS MULTIPLAYER PAGE] Component mounted');
    return () => {
      console.log('🗑️ [CHESS MULTIPLAYER PAGE] Component unmounting');
    };
  }, []);

  useEffect(() => {
    console.log('🔄 [CHESS MULTIPLAYER PAGE] State changed:', { currentView, currentLobby: !!currentLobby, isHost });
  }, [currentView, currentLobby, isHost]);

  console.log('🔧 [CHESS MULTIPLAYER PAGE] Creating handleStartGame function');
  const handleStartGame = useCallback((lobby: Lobby, isHostPlayer: boolean) => {
    console.log('🚨🚨🚨 [CHESS MULTIPLAYER PAGE] handleStartGame CALLED! 🚨🚨🚨');
    try {
      console.log('🎮 [CHESS MULTIPLAYER PAGE] handleStartGame called with:', {
        lobby: lobby,
        isHostPlayer: isHostPlayer,
        currentView: currentView
      });
      
      setCurrentLobby(lobby);
       setIsHost(isHostPlayer);
       setCurrentView('game');
       setRenderKey(prev => prev + 1);
       
       console.log('✅ [CHESS MULTIPLAYER PAGE] State updated successfully - should transition to game view', { renderKey: renderKey + 1 });
    } catch (error) {
      console.error('❌ [CHESS MULTIPLAYER PAGE] Error in handleStartGame:', error);
    }
  }, [currentView]);

  const handleBackToLobby = () => {
    setCurrentView('lobby');
    setCurrentLobby(null);
    setIsHost(false);
  };

  const handleBackToChess = () => {
    window.location.href = '/chess/singleplayer';
  };

  console.log('🖥️ [CHESS MULTIPLAYER PAGE] Render - currentView:', currentView, 'currentLobby:', currentLobby, 'isHost:', isHost, 'renderKey:', renderKey);
  
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
      <div key={`game-${renderKey}`} className="w-full h-screen">
        <MultiplayerChessClient
          lobby={currentLobby}
          isHost={isHost}
          onGameEnd={handleBackToLobby}
        />
      </div>
    );
  }
  
  console.log('🏠 [CHESS MULTIPLAYER PAGE] Rendering lobby view');
  console.log('🔗 [CHESS MULTIPLAYER PAGE] Passing handleStartGame to MultiplayerLobby:', typeof handleStartGame);

  return (
    <div key={`lobby-${renderKey}`} className="w-full h-screen bg-chess-background flex items-center justify-center overflow-hidden">
      <MultiplayerLobby
        gameType="chess"
        onStartGame={handleStartGame}
        onBackToMenu={handleBackToChess}
      />
    </div>
  );
}