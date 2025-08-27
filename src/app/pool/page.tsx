"use client";

import { useState, useEffect } from 'react';
import { MultiplayerLobby } from '@/components/game/MultiplayerLobby';
import { PoolClient } from '@/components/game/pool/PoolClient'; // Will create this component
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';

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

export default function PoolPage() {
  const { createLobby, joinLobby, leaveLobby, currentLobby, sendGameMove, setupGameMovesListener, onGameMove, onLobbyJoined, onLobbyLeft, onLobbyClosed } = useFirebaseMultiplayer();
  const [gameStarted, setGameStarted] = useState(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (currentLobby && currentLobby.status === 'playing') {
      setGameStarted(true);
    }
  }, [currentLobby]);

  const handleCreateLobby = async (player1Name: string, player1Id: string) => {
    try {
      const lobby = await createLobby('pool', player1Name, player1Id);
      setLobbyId(lobby.id);
      setIsHost(true);
      console.log('Lobby created:', lobby.id);
    } catch (error) {
      console.error('Error creating lobby:', error);
    }
  };

  const handleJoinLobby = async (id: string, player2Name: string, player2Id: string) => {
    try {
      await joinLobby(id, player2Name, player2Id);
      setLobbyId(id);
      setIsHost(false);
      console.log('Joined lobby:', id);
    } catch (error) {
      console.error('Error joining lobby:', error);
    }
  };

  const handleLeaveLobby = async () => {
    if (lobbyId) {
      await leaveLobby(lobbyId);
      setLobbyId(null);
      setGameStarted(false);
      setIsHost(false);
      console.log('Left lobby:', lobbyId);
    }
  };

  if (gameStarted && currentLobby) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-700 to-green-900 text-white p-4">
        <PoolClient lobby={currentLobby} isHost={isHost} onGameEnd={handleLeaveLobby} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-700 to-green-900 text-white p-4">
      <MultiplayerLobby
            gameType="pool"
            onCreateLobby={handleCreateLobby}
            onJoinLobby={handleJoinLobby}
            onLeaveLobby={handleLeaveLobby}
            lobbyId={lobbyId}
            currentLobby={currentLobby}
            onLobbyJoined={onLobbyJoined}
            onLobbyLeft={onLobbyLeft}
            onLobbyClosed={onLobbyClosed}
          />
    </div>
  );
}