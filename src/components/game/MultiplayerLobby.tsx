"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, ArrowLeft } from 'lucide-react';
import { CreateLobby } from './CreateLobby';
import { LobbyList } from './LobbyList';
import { MenuLayout } from '@/components/layout/MenuLayout';

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

interface MultiplayerLobbyProps {
  gameType: 'chess' | 'uno';
  onStartGame?: (lobby: Lobby, isHost: boolean) => void;
  onBackToMenu?: () => void;
}

export function MultiplayerLobby({ gameType, onStartGame, onBackToMenu }: MultiplayerLobbyProps) {
  const [activeTab, setActiveTab] = useState('browse');
  const [gameStarting, setGameStarting] = useState(false);

  const handleLobbyCreated = (lobby: Lobby) => {
    console.log('Lobby created:', lobby);
    // The CreateLobby component will handle the waiting state
  };

  const handleGameStart = (lobby: Lobby, isHost: boolean) => {
    console.log('Game starting:', lobby, 'isHost:', isHost);
    setGameStarting(true);
    setTimeout(() => {
      onStartGame?.(lobby, isHost);
    }, 1000);
  };

  const handleJoinLobby = (lobby: Lobby) => {
    console.log('Joining lobby:', lobby);
    setGameStarting(true);
    // Start the game as a player (not host)
    setTimeout(() => {
      onStartGame?.(lobby, false);
    }, 1000);
  };

  const handleBackToMenu = () => {
    onBackToMenu?.();
  };

  if (gameStarting) {
    return (
      <MenuLayout>
        <div className="w-full max-w-md mx-auto text-center my-auto">
          <Card className="bg-black/50 border-white/10">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
                <h3 className="text-xl font-semibold text-white">
                  Starting {gameType.toUpperCase()} Game...
                </h3>
                <p className="text-white/70">
                  Get ready to play!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MenuLayout>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-start relative z-20 overflow-auto pb-4 sm:pb-6">
      <div className="bg-black/50 rounded-xl p-4 sm:p-6 flex-1 max-h-[85vh] sm:max-h-[90vh] overflow-hidden relative z-10">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-headline uppercase tracking-wider mb-2 sm:mb-4 text-white" style={{ WebkitTextStroke: '1px black', textShadow: '0 0 20px rgba(255, 255, 255, 0.3)' }}>
            {gameType.toUpperCase()} Multiplayer
          </h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="flex justify-center items-center mb-3 sm:mb-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/10">
                <TabsTrigger 
                  value="browse" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white text-sm sm:text-base"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Browse Lobbies
                </TabsTrigger>
                <TabsTrigger 
                  value="create"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white text-sm sm:text-base"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Lobby
                </TabsTrigger>
              </TabsList>
            </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="browse" className="mt-0 h-full overflow-auto">
              <LobbyList
                gameType={gameType}
                onJoinLobby={handleJoinLobby}
                onBackToMenu={handleBackToMenu}
              />
            </TabsContent>

            <TabsContent value="create" className="mt-0 h-full overflow-auto">
              <div className="flex justify-center h-full items-center">
                <CreateLobby
                  gameType={gameType}
                  onLobbyCreated={handleLobbyCreated}
                  onGameStart={handleGameStart}
                  onBackToMenu={handleBackToMenu}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}