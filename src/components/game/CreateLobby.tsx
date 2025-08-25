"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Users, Loader2 } from 'lucide-react';
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
}

interface CreateLobbyProps {
  gameType: 'chess' | 'uno';
  onLobbyCreated?: (lobby: Lobby) => void;
  onGameStart?: (lobby: Lobby, isHost: boolean) => void;
  onBackToMenu?: () => void;
}

export function CreateLobby({ gameType, onLobbyCreated, onGameStart, onBackToMenu }: CreateLobbyProps) {
  const { createLobby, leaveLobby, currentLobby, isConnected } = useFirebaseMultiplayer();
  const { username, account } = useWeb3();
  const [hostName, setHostName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  // Use wallet username if available, otherwise require manual input
  const effectiveHostName = username && account ? username : hostName;

  const handleCreateLobby = () => {
    if (!effectiveHostName.trim()) {
      if (account) {
        alert('Please set a username in your wallet profile');
      } else {
        alert('Please connect your wallet or enter your name');
      }
      return;
    }

    setIsCreating(true);
    createLobby(gameType, effectiveHostName.trim(), account || 'mock-user');
    // The lobby creation will be handled by the socket event listener
    // setIsWaiting will be triggered when currentLobby is set
  };

  const handleCancelLobby = async () => {
    if (currentLobby) {
      // Leave the lobby - this will delete it since we're the host
      await leaveLobby(currentLobby.id, currentLobby.player1Id);
      setIsWaiting(false);
      onBackToMenu?.();
    }
  };

  // Handle lobby creation success
  useEffect(() => {
    if (currentLobby && currentLobby.player1Id && isCreating) {
      setIsCreating(false);
      setIsWaiting(true);
      onLobbyCreated?.(currentLobby);
    }
  }, [currentLobby, isCreating, onLobbyCreated]);

  // Handle when a player joins and game should start
  useEffect(() => {
    if (currentLobby && currentLobby.player2Id && currentLobby.status === 'playing') {
      console.log('Player joined lobby, starting game as host');
      onGameStart?.(currentLobby, true);
    }
  }, [currentLobby, onGameStart]);

  // If we have a current lobby and we're the host, show waiting screen
  if (currentLobby && (isWaiting || currentLobby.player1Name === effectiveHostName)) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="bg-black/50 border-white/10">
          <CardHeader className="text-center pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-headline uppercase tracking-wider text-white" style={{ WebkitTextStroke: '1px black' }}>
              Lobby Created
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6 text-center pb-4 sm:pb-6">
            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 animate-spin text-primary" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-1 sm:mb-2">
                  Waiting for a player...
                </h3>
                <p className="text-white/70 text-xs sm:text-sm lg:text-base">
                  Share your lobby ID with friends or wait for someone to join
                </p>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-2 sm:p-3 lg:p-4 space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm text-white/70">Lobby PIN:</p>
              <p className="font-mono text-sm sm:text-lg lg:text-xl text-primary">
                {currentLobby.id}
              </p>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70 justify-center">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Host: {currentLobby.player1Name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70 justify-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Game: {currentLobby.gameType.toUpperCase()}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleCancelLobby}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 text-sm sm:text-base"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-black/50 border-white/10">
        <CardHeader className="text-center pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl lg:text-2xl font-headline uppercase tracking-wider text-white" style={{ WebkitTextStroke: '1px black' }}>
            Create {gameType.toUpperCase()} Lobby
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6 overflow-auto pb-4 sm:pb-6">
          {!isConnected && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 sm:p-4">
            <p className="text-red-300 text-xs sm:text-sm text-center">
              Connecting to multiplayer service...
            </p>
          </div>
        )}

          <div className="space-y-3 sm:space-y-4">
            {username && account ? (
              <div className="bg-white/10 rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
                <p className="text-xs sm:text-sm text-white/70">Playing as:</p>
                <p className="font-semibold text-sm sm:text-base text-white">{username}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-white/70">
                  Your Name
                </label>
                <Input
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm sm:text-base"
                  maxLength={20}
                  disabled={isCreating}
                />
                {!account && (
                  <p className="text-xs text-white/50">
                    Tip: Connect your wallet to use your saved username
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleCreateLobby}
              disabled={!effectiveHostName.trim() || isCreating || !isConnected}
              className="w-full bg-primary hover:bg-primary/80 text-white text-sm sm:text-base"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Create Lobby
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}