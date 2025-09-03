"use client";

import { useState, useCallback, useEffect } from 'react';
import { MultiplayerLobby } from '@/components/game/MultiplayerLobby';
import { MultiplayerChessClient } from '@/components/game/chess/MultiplayerChessClient';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';

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
  const { currentLobby: firebaseLobby } = useFirebaseMultiplayer();

  // Keep currentLobby synchronized with Firebase lobby updates
  useEffect(() => {
    console.log('🔍 [CHESS PAGE] Firebase lobby sync check:', {
      currentView,
      hasFirebaseLobby: !!firebaseLobby,
      firebaseLobbyId: firebaseLobby?.id,
      hasCurrentLobby: !!currentLobby,
      currentLobbyId: currentLobby?.id,
      firebaseLobbyPlayer2Id: firebaseLobby?.player2Id
    });
    
    // Always use Firebase lobby data when in game view and Firebase has lobby data
    if (currentView === 'game' && firebaseLobby) {
      console.log('🔄 [CHESS PAGE] Using Firebase lobby data:', firebaseLobby);
      setCurrentLobby(firebaseLobby);
    }
  }, [firebaseLobby, currentView]);

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
    console.log('🎮 [CHESS MULTIPLAYER PAGE] handleStartGame called with:', {
      lobby: lobby,
      isHostPlayer: isHostPlayer,
      hasPlayer2: !!lobby.player2Id,
      currentView: currentView
    });
    
    try {
      // Ensure lobby has both players before starting
      if (!lobby.player2Id) {
        console.log('⚠️ [CHESS PAGE] Lobby missing player2, cannot start game');
        return;
      }
      
      // Use the most up-to-date lobby data
      const finalLobby = firebaseLobby && firebaseLobby.player2Id ? firebaseLobby : lobby;
      console.log('🚀 [CHESS PAGE] Starting game immediately for both players with lobby:', finalLobby);
      
      setCurrentLobby(finalLobby);
      setIsHost(isHostPlayer);
      setCurrentView('game');
      setRenderKey(prev => prev + 1);
      
      console.log('✅ [CHESS MULTIPLAYER PAGE] Game transition completed - currentView: game, isHost:', isHostPlayer);
    } catch (error) {
      console.error('❌ [CHESS MULTIPLAYER PAGE] Error in handleStartGame:', error);
    }
  }, [currentView, firebaseLobby]);

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