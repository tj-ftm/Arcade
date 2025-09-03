"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, ArrowLeft } from 'lucide-react';
import { CreateLobby } from './CreateLobby';
import { LobbyList } from './LobbyList';
import { OngoingGameScreen } from './OngoingGameScreen';
import { MenuLayout } from '@/components/layout/MenuLayout';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { useWeb3 } from '@/components/web3/Web3Provider';

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

interface MultiplayerLobbyProps {
  gameType: 'chess' | 'uno' | 'pool';
  onStartGame?: (lobby: Lobby, isHost: boolean) => void;
  onBackToMenu?: () => void;
}

export function MultiplayerLobby({ gameType, onStartGame, onBackToMenu }: MultiplayerLobbyProps) {
  console.log('🎮 [MULTIPLAYER LOBBY] Component initialized with onStartGame:', typeof onStartGame, !!onStartGame);
  const [activeTab, setActiveTab] = useState('browse');
  const [gameStarting, setGameStarting] = useState(false);
  const [gameStartTimeout, setGameStartTimeout] = useState<NodeJS.Timeout | null>(null);
  const [ongoingGame, setOngoingGame] = useState<{ lobby: Lobby; isHost: boolean } | null>(null);
  const gameStartingRef = useRef(false);
  
  const { account, currentChain } = useWeb3();
  const { onLobbyJoined, startGame, checkForExistingLobby, leaveLobby } = useFirebaseMultiplayer(currentChain, gameType);
  
  const currentUserId = account || `guest-${Date.now()}`;
  
  // Check for existing lobby on component mount
  useEffect(() => {
    const checkExistingLobby = async () => {
      try {
        const existingLobby = await checkForExistingLobby();
        if (existingLobby && existingLobby.lobby.gameType === gameType) {
          console.log('🔄 [MULTIPLAYER LOBBY] Found existing lobby, showing ongoing game screen:', existingLobby);
          // Show ongoing game screen instead of automatically starting
          setOngoingGame(existingLobby);
        }
      } catch (error) {
        console.error('Error checking for existing lobby:', error);
      }
    };
    
    checkExistingLobby();
  }, [gameType, checkForExistingLobby]);
  
  const handleGameStart = useCallback(async (lobby: Lobby, isHost: boolean) => {
    console.log('🎯 [MULTIPLAYER LOBBY] Game start triggered:', {
      lobby: lobby,
      isHost: isHost,
      currentUserId: currentUserId
    });
    
    setGameStarting(true);
    
    // Only the host should update the lobby status to 'playing'
    if (isHost) {
      console.log('🔥 [MULTIPLAYER LOBBY] Host updating lobby status to playing:', lobby.id);
      await startGame(lobby.id);
      console.log('✅ [MULTIPLAYER LOBBY] Lobby status updated to playing');
    } else {
      console.log('👥 [MULTIPLAYER LOBBY] Non-host player, waiting for host to start game');
    }
    
    // Immediate transition to game for both players
    console.log('🚀 [MULTIPLAYER LOBBY] Starting game immediately for both players');
    try {
      onStartGame?.(lobby, isHost);
      console.log('✅ [MULTIPLAYER LOBBY] onStartGame callback completed successfully');
    } catch (error) {
      console.error('❌ [MULTIPLAYER LOBBY] Error in onStartGame callback:', error);
    }
  }, [onStartGame, startGame]);

  // Set up lobby joined callback for both host and joining player
  useEffect(() => {
    console.log('👂 [MULTIPLAYER LOBBY] Setting up lobby joined listener for user:', currentUserId);
    const unsubscribe = onLobbyJoined((lobby: Lobby) => {
      console.log('🔔 [MULTIPLAYER LOBBY] Lobby joined callback triggered:', {
        lobby: lobby,
        currentUserId: currentUserId
      });
      
      const isHost = currentUserId === lobby.player1Id;
      const isJoiningPlayer = currentUserId === lobby.player2Id;
      
      console.log('🔍 [MULTIPLAYER LOBBY] Player role analysis:', {
        isHost: isHost,
        isJoiningPlayer: isJoiningPlayer,
        player1Id: lobby.player1Id,
        player2Id: lobby.player2Id,
        hasPlayer2: !!lobby.player2Id
      });
      
      // Trigger for both host and joining player when lobby has both players
      if ((isHost || isJoiningPlayer) && lobby.player2Id) {
        console.log('🚀 [MULTIPLAYER LOBBY] Conditions met, starting game:', {
          isHost: isHost,
          isJoiningPlayer: isJoiningPlayer,
          hasPlayer2: !!lobby.player2Id
        });
        handleGameStart(lobby, isHost);
      } else {
        console.log('⏸️ [MULTIPLAYER LOBBY] Game start conditions not met:', {
          isHostOrJoining: isHost || isJoiningPlayer,
          hasPlayer2: !!lobby.player2Id,
          gameStarting: gameStartingRef.current,
          reason: !isHost && !isJoiningPlayer ? 'Not host or joining player' :
                  !lobby.player2Id ? 'No player 2' :
                  gameStartingRef.current ? 'Game already starting' : 'Unknown'
        });
      }
    });
    return () => {
      console.log('🔇 [MULTIPLAYER LOBBY] Unsubscribing from lobby joined listener');
      unsubscribe();
    };
  }, [currentUserId, onLobbyJoined]);
  
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

  const handleRejoinGame = (lobby: Lobby, isHost: boolean) => {
    console.log('🔄 [MULTIPLAYER LOBBY] Rejoining game:', { lobby, isHost });
    setOngoingGame(null);
    handleGameStart(lobby, isHost);
  };

  const handleTerminateGame = async () => {
    if (!ongoingGame) return;
    
    console.log('🗑️ [MULTIPLAYER LOBBY] Terminating ongoing game:', ongoingGame.lobby.id);
    try {
      await leaveLobby(ongoingGame.lobby.id, currentUserId);
      setOngoingGame(null);
      console.log('✅ [MULTIPLAYER LOBBY] Game terminated successfully');
    } catch (error) {
      console.error('❌ [MULTIPLAYER LOBBY] Error terminating game:', error);
      throw error;
    }
  };

  const handleBackToMenuFromOngoing = () => {
    setOngoingGame(null);
    onBackToMenu?.();
  };

  const handleBackToMenu = () => {
    onBackToMenu?.();
  };

  // Show ongoing game screen if there's an active game
  if (ongoingGame) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <OngoingGameScreen
          lobby={ongoingGame.lobby}
          isHost={ongoingGame.isHost}
          onRejoinGame={handleRejoinGame}
          onTerminateGame={handleTerminateGame}
          onBackToMenu={handleBackToMenuFromOngoing}
        />
      </div>
    );
  }

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

  const getGameGradient = () => {
    switch (gameType) {
      case 'uno':
        return 'bg-gradient-to-br from-red-900 via-red-700 to-orange-900';
      case 'chess':
        return 'bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900';
      case 'pool':
        return 'bg-gradient-to-br from-green-900 via-green-700 to-emerald-900';
      default:
        return 'bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900';
    }
  };

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center p-4 ${getGameGradient()} text-white overflow-auto`}>
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
    </div>
  );
}