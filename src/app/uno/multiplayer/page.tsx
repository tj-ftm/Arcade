"use client";

import { useState, useEffect } from 'react';
import { MultiplayerLobby } from '@/components/game/MultiplayerLobby';
import { MultiplayerUnoClient } from '@/components/game/uno/MultiplayerUnoClient';
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

export default function UnoMultiplayerPage() {
  const [currentView, setCurrentView] = useState<'lobby' | 'game'>('lobby');
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [isHost, setIsHost] = useState(false);
  const { currentLobby: firebaseLobby } = useFirebaseMultiplayer();

  // Keep currentLobby synchronized with Firebase lobby updates
  useEffect(() => {
    console.log('🔍 [UNO PAGE] Firebase lobby sync check:', {
      currentView,
      hasFirebaseLobby: !!firebaseLobby,
      firebaseLobbyId: firebaseLobby?.id,
      hasCurrentLobby: !!currentLobby,
      currentLobbyId: currentLobby?.id,
      firebaseLobbyPlayer2Id: firebaseLobby?.player2Id
    });
    
    // Always use Firebase lobby data when in game view and Firebase has lobby data
    if (currentView === 'game' && firebaseLobby) {
      console.log('🔄 [UNO PAGE] Using Firebase lobby data:', firebaseLobby);
      setCurrentLobby(firebaseLobby);
    }
  }, [firebaseLobby, currentView]);

  const handleStartGame = (lobby: Lobby, isHostPlayer: boolean) => {
    console.log('🎮 [UNO PAGE] handleStartGame called with:', { lobby, isHostPlayer, hasPlayer2: !!lobby.player2Id });
    
    // Ensure lobby has both players before starting
    if (!lobby.player2Id) {
      console.log('⚠️ [UNO PAGE] Lobby missing player2, cannot start game');
      return;
    }
    
    // Use the most up-to-date lobby data
    const finalLobby = firebaseLobby && firebaseLobby.player2Id ? firebaseLobby : lobby;
    console.log('🚀 [UNO PAGE] Starting game immediately for both players with lobby:', finalLobby);
    
    setCurrentLobby(finalLobby);
    setIsHost(isHostPlayer);
    setCurrentView('game');
    
    console.log('✅ [UNO PAGE] Game transition completed - currentView: game, isHost:', isHostPlayer);
  };

  console.log('Render - currentView:', currentView, 'currentLobby:', currentLobby);

  if (currentView === 'game' && currentLobby) {
    console.log('Rendering MultiplayerUnoClient');
  };

  const handleBackToLobby = () => {
    setCurrentView('lobby');
    setCurrentLobby(null);
    setIsHost(false);
  };

  const handleBackToUno = () => {
    window.location.href = '/singleplayer';
  };

  console.log('Render - currentView:', currentView, 'currentLobby:', currentLobby);

  if (currentView === 'game' && currentLobby) {
    console.log('Rendering MultiplayerUnoClient');
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