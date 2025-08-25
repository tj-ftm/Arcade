"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Clock, GamepadIcon } from 'lucide-react';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { useWeb3 } from '@/components/web3/Web3Provider';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  player1Color?: 'white' | 'black';
  player2Color?: 'white' | 'black';
}

interface LobbyListProps {
  gameType: 'chess' | 'uno';
  onJoinLobby?: (lobby: Lobby) => void;
  onBackToMenu?: () => void;
}

export function LobbyList({ gameType, onJoinLobby, onBackToMenu }: LobbyListProps) {
  const { lobbies, joinLobby, isConnected } = useFirebaseMultiplayer();
  const { username, account } = useWeb3();
  const [playerName, setPlayerName] = useState('');
  const [lobbyIdToJoin, setLobbyIdToJoin] = useState('');
  const [joiningLobby, setJoiningLobby] = useState<string | null>(null);

  // Use wallet username if available, otherwise require manual input
  const effectivePlayerName = username && account ? username : playerName;

  const filteredLobbies = lobbies.filter(lobby => 
    lobby.gameType === gameType && lobby.status === 'waiting'
  );

  const handleJoinLobby = async (lobby: Lobby) => {
    if (!effectivePlayerName.trim()) {
      if (account) {
        alert('Please set a username in your wallet profile');
      } else {
        alert('Please connect your wallet or enter your name');
      }
      return;
    }

    console.log('Attempting to join lobby:', lobby.id);
    console.log('Effective Player Name:', effectivePlayerName.trim());
    console.log('Is Connected:', isConnected);
    
    setJoiningLobby(lobby.id);
    try {
      await joinLobby(lobby.id, effectivePlayerName.trim(), account || `guest_${Date.now()}`);
      console.log('Successfully joined lobby, calling onJoinLobby callback');
      onJoinLobby?.(lobby);
    } catch (error) {
      console.error('Failed to join lobby:', error);
      alert('Failed to join lobby. Please try again.');
    } finally {
      setJoiningLobby(null);
    }
  };

  const handleJoinLobbyById = async () => {
    if (!effectivePlayerName.trim()) {
      if (account) {
        alert('Please set a username in your wallet profile');
      } else {
        alert('Please connect your wallet or enter your name');
      }
      return;
    }
    if (!lobbyIdToJoin.trim()) {
      alert('Please enter a 4-digit PIN');
      return;
    }
    if (lobbyIdToJoin.length !== 4 || !/^\d{4}$/.test(lobbyIdToJoin)) {
      alert('Please enter a valid 4-digit PIN');
      return;
    }

    // Automatically add game prefix to the 4-digit PIN
    const fullLobbyId = `${gameType.toUpperCase()}-${lobbyIdToJoin}`;
    console.log('Attempting to join lobby by ID:', fullLobbyId);
    console.log('Effective Player Name:', effectivePlayerName.trim());
    console.log('Is Connected:', isConnected);
    
    setJoiningLobby(fullLobbyId);
    try {
      await joinLobby(fullLobbyId, effectivePlayerName.trim(), account || `guest_${Date.now()}`);
      console.log('Successfully joined lobby by ID');
      // Find the lobby in the list to pass to callback
      const foundLobby = lobbies.find(l => l.id === fullLobbyId);
      if (foundLobby) {
        onJoinLobby?.(foundLobby);
      }
      setLobbyIdToJoin(''); // Clear the input
    } catch (error) {
      console.error('Failed to join lobby by ID:', error);
      alert('Failed to join lobby. Please check the PIN and your name.');
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
            <p className="text-red-300 text-sm sm:text-base">
              Connecting to multiplayer service...
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {username && account ? (
          <div className="bg-white/10 rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
            <p className="text-xs sm:text-sm text-white/70">Playing as:</p>
            <p className="font-semibold text-sm sm:text-base text-white">{username}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm sm:text-base"
                maxLength={20}
              />
            </div>
            {!account && (
              <p className="text-xs text-white/50 text-center">
                Tip: Connect your wallet to use your saved username
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
          <Input
            placeholder="Enter 4-digit PIN (e.g. 1234)"
            value={lobbyIdToJoin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Only allow digits
              setLobbyIdToJoin(value);
            }}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm sm:text-base"
            maxLength={4} // Only 4 digits needed
          />
          <Button
            onClick={handleJoinLobbyById}
            disabled={lobbyIdToJoin.length !== 4 || !effectivePlayerName.trim() || joiningLobby !== null || !isConnected}
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
                      <span className="truncate">{lobby.player1Name}'s Game</span>
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
                      disabled={!effectivePlayerName.trim() || joiningLobby === lobby.id || !isConnected}
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