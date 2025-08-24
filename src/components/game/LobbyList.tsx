"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Clock, GamepadIcon } from 'lucide-react';
import { useSocket } from '@/hooks/use-socket';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  hostId: string;
  hostName: string;
  playerId?: string;
  playerName?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
}

interface LobbyListProps {
  gameType: 'chess' | 'uno';
  onJoinLobby?: (lobby: Lobby) => void;
  onBackToMenu?: () => void;
}

export function LobbyList({ gameType, onJoinLobby, onBackToMenu }: LobbyListProps) {
  const { lobbies, joinLobby, isConnected } = useSocket();
  const [playerName, setPlayerName] = useState('');
  const [lobbyIdToJoin, setLobbyIdToJoin] = useState('');
  const [joiningLobby, setJoiningLobby] = useState<string | null>(null);

  const filteredLobbies = lobbies.filter(lobby => 
    lobby.gameType === gameType && lobby.status === 'waiting'
  );

  const handleJoinLobby = async (lobby: Lobby) => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setJoiningLobby(lobby.id);
    try {
      joinLobby(lobby.id, playerName.trim());
      onJoinLobby?.(lobby);
    } catch (error) {
      console.error('Failed to join lobby:', error);
      alert('Failed to join lobby. Please try again.');
    } finally {
      setJoiningLobby(null);
    }
  };

  const handleJoinLobbyById = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!lobbyIdToJoin.trim()) {
      alert('Please enter a Lobby ID');
      return;
    }

    setJoiningLobby(lobbyIdToJoin);
    try {
      joinLobby(lobbyIdToJoin, playerName.trim());
      // Assuming successful join will be handled by socket context, no direct onJoinLobby call here
    } catch (error) {
      console.error('Failed to join lobby by ID:', error);
      alert('Failed to join lobby. Please check the ID and your name.');
    } finally {
      setJoiningLobby(null);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="w-full h-full space-y-3 sm:space-y-4 pb-4 sm:pb-6">
      <div className="text-center space-y-2 sm:space-y-4">
        {!isConnected && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 sm:p-4">
            <p className="text-red-300 text-sm sm:text-base">Connecting to multiplayer server...</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
          <Input
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm sm:text-base"
            maxLength={20}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
          <Input
            placeholder="Enter Lobby PIN (e.g. CHESS-1234)"
            value={lobbyIdToJoin}
            onChange={(e) => setLobbyIdToJoin(e.target.value.toUpperCase())}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm sm:text-base"
            maxLength={9} // Format: CHESS-1234 or UNO-1234
          />
          <Button
            onClick={handleJoinLobbyById}
            disabled={!lobbyIdToJoin.trim() || !playerName.trim() || joiningLobby !== null || !isConnected}
            className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-white text-sm sm:text-base"
          >
            {joiningLobby === lobbyIdToJoin ? 'Joining...' : 'Join by ID'}
          </Button>
        </div>

        <div className="overflow-auto max-h-[40vh] sm:max-h-[45vh] lg:max-h-[50vh]">
          {filteredLobbies.length === 0 ? (
            <div className="text-center py-6 sm:py-8 space-y-3 sm:space-y-4">
              <GamepadIcon className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-white/30 mx-auto" />
              <div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white/70 mb-1 sm:mb-2">
                  No lobbies available
                </h3>
                <p className="text-white/50 text-xs sm:text-sm lg:text-base">
                  Be the first to create a {gameType} lobby!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLobbies.map((lobby) => (
                <Card key={lobby.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <span className="truncate">{lobby.hostName}'s Game</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      Created {formatTimeAgo(lobby.createdAt)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-400">Waiting for player</span>
                    </div>

                    <Button
                      onClick={() => handleJoinLobby(lobby)}
                      disabled={!playerName.trim() || joiningLobby === lobby.id || !isConnected}
                      className="w-full bg-primary hover:bg-primary/80 text-white text-sm sm:text-base"
                    >
                      {joiningLobby === lobby.id ? 'Joining...' : 'Join Game'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}