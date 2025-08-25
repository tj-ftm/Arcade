"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, ArrowLeft } from 'lucide-react';
import { CreateLobby } from './CreateLobby';
import { LobbyList } from './LobbyList';
import { MenuLayout } from '@/components/layout/MenuLayout';
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
  createdAt: any; // Firebase timestamp
}

interface MultiplayerLobbyProps {
  gameType: 'chess' | 'uno';
  onStartGame?: (lobby: Lobby, isHost: boolean) => void;
  onBackToMenu?: () => void;
}

export function MultiplayerLobby({ gameType, onStartGame, onBackToMenu }: MultiplayerLobbyProps) {
  const [activeTab, setActiveTab] = useState('browse');
  const [gameStarting, setGameStarting] = useState(false);
  const [gameStartTimeout, setGameStartTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const { onLobbyJoined, startGame } = useFirebaseMultiplayer();
  const { account } = useWeb3();
  
  const currentUserId = account || `guest-${Date.now()}`;
  
  const handleGameStart = useCallback(async (lobby: Lobby, isHost: boolean) => {
    console.log('🎯 [MULTIPLAYER LOBBY] Game start triggered:', {
      lobby: lobby,
      isHost: isHost,
      gameStarting: gameStarting,
      currentUserId: currentUserId
    });
    
    // Clear any existing timeout
    setGameStartTimeout(prev => {
      if (prev) {
        console.log('🧹 [MULTIPLAYER LOBBY] Clearing existing timeout');
        clearTimeout(prev);
      }
      return null;
    });
    
    console.log('⏳ [MULTIPLAYER LOBBY] Setting game starting state to true');
    setGameStarting(true);
    
    // Start the game in Firebase (update status to 'playing')
    console.log('🔥 [MULTIPLAYER LOBBY] Calling startGame for lobby:', lobby.id);
    await startGame(lobby.id);
    console.log('✅ [MULTIPLAYER LOBBY] startGame completed');
    
    const timeout = setTimeout(() => {
      console.log('⏰ [MULTIPLAYER LOBBY] Timeout completed, calling onStartGame with:', {
        lobby: lobby,
        isHost: isHost
      });
      // Ensure lobby status is set to 'playing' before calling onStartGame
      const updatedLobby = { ...lobby, status: 'playing' as const };
      onStartGame?.(updatedLobby, isHost);
      console.log('🎮 [MULTIPLAYER LOBBY] onStartGame callback completed');
      setGameStartTimeout(null);
    }, 1500); // Reduced delay since we're now properly managing state
    
    setGameStartTimeout(timeout);
  }, [onStartGame, startGame, gameStarting, currentUserId]);

  // Set up lobby joined callback for both host and joining player
  useEffect(() => {
    console.log('👂 [MULTIPLAYER LOBBY] Setting up lobby joined listener for user:', currentUserId);
    const unsubscribe = onLobbyJoined((lobby: Lobby) => {
      console.log('🔔 [MULTIPLAYER LOBBY] Lobby joined callback triggered:', {
        lobby: lobby,
        currentUserId: currentUserId,
        gameStarting: gameStarting
      });
      
      const isHost = currentUserId === lobby.player1Id;
      const isJoiningPlayer = currentUserId === lobby.player2Id;
      
      console.log('🔍 [MULTIPLAYER LOBBY] Player role analysis:', {
        isHost: isHost,
        isJoiningPlayer: isJoiningPlayer,
        player1Id: lobby.player1Id,
        player2Id: lobby.player2Id,
        hasPlayer2: !!lobby.player2Id,
        gameStarting: gameStarting
      });
      
      // Trigger for both host and joining player when lobby has both players
      if ((isHost || isJoiningPlayer) && lobby.player2Id && !gameStarting) {
        console.log('🚀 [MULTIPLAYER LOBBY] Conditions met, starting game:', {
          isHost: isHost,
          isJoiningPlayer: isJoiningPlayer,
          hasPlayer2: !!lobby.player2Id,
          gameStarting: gameStarting
        });
        handleGameStart(lobby, isHost);
      } else {
        console.log('⏸️ [MULTIPLAYER LOBBY] Game start conditions not met:', {
          isHostOrJoining: isHost || isJoiningPlayer,
          hasPlayer2: !!lobby.player2Id,
          gameStarting: gameStarting,
          reason: !isHost && !isJoiningPlayer ? 'Not host or joining player' :
                  !lobby.player2Id ? 'No player 2' :
                  gameStarting ? 'Game already starting' : 'Unknown'
        });
      }
    });
    return () => {
      console.log('🔇 [MULTIPLAYER LOBBY] Unsubscribing from lobby joined listener');
      unsubscribe();
    };
  }, [currentUserId, onLobbyJoined, handleGameStart, gameStarting]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (gameStartTimeout) {
        clearTimeout(gameStartTimeout);
      }
    };
  }, [gameStartTimeout]);

  const handleLobbyCreated = (lobby: Lobby) => {
    console.log('Lobby created:', lobby);
    // The CreateLobby component will handle the waiting state
  };

  const handleJoinLobby = (lobby: Lobby) => {
    console.log('🎯 [MULTIPLAYER LOBBY] handleJoinLobby called with:', {
      lobby: lobby,
      currentUserId: currentUserId,
      gameStarting: gameStarting
    });
    
    // Immediately show loading screen for joining player
    const isHost = currentUserId === lobby.player1Id;
    console.log('🔍 [MULTIPLAYER LOBBY] Join lobby analysis:', {
      isHost: isHost,
      player1Id: lobby.player1Id,
      player2Id: lobby.player2Id
    });
    
    console.log('🚀 [MULTIPLAYER LOBBY] Calling handleGameStart from handleJoinLobby');
    handleGameStart(lobby, isHost);
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