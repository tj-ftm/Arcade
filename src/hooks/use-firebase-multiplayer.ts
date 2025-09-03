import { useEffect, useState, useRef, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, push, onValue, off, remove, set, serverTimestamp, get } from 'firebase/database';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno' | 'pool';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any; // Firebase timestamp
  lastActivity?: any; // Firebase timestamp for cleanup
  expiresAt?: any; // Firebase timestamp for auto-expiration
  poolGameState?: any;
  chain: 'sonic' | 'base'; // Chain identifier
}

interface GameResult {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  gameStartTime: any;
  gameEndTime: any;
  gameDuration: number; // in seconds
  lobbyId: string;
}

interface UseFirebaseMultiplayerReturn {
  isConnected: boolean;
  lobbies: Lobby[];
  currentLobby: Lobby | null;
  createLobby: (gameType: 'chess' | 'uno' | 'pool', player1Name: string, player1Id: string) => Promise<Lobby>;
  joinLobby: (lobbyId: string, player2Name: string, player2Id: string) => Promise<void>;
  leaveLobby: (lobbyId: string, playerId?: string) => Promise<void>;
  startGame: (lobbyId: string) => Promise<void>;
  endGame: (lobbyId: string, winnerId: string, winnerName: string, loserId: string, loserName: string) => Promise<void>;
  sendGameMove: (lobbyId: string, poolGameState: any) => Promise<void>;
  onGameMove: (callback: (poolGameState: any) => void) => () => void;
  setupGameMovesListener: (lobbyId: string) => void;
  onLobbyJoined: (callback: (lobby: Lobby) => void) => void;
  onLobbyLeft: (callback: (lobby: Lobby) => void) => void;
  onLobbyClosed: (callback: () => void) => void;
  cleanupExpiredLobbies: () => Promise<void>;
  checkForExistingLobby: () => Promise<{ lobby: Lobby; isHost: boolean } | null>;
}

export const useFirebaseMultiplayer = (chain: 'sonic' | 'base' = 'sonic', gameType?: 'chess' | 'uno' | 'pool'): UseFirebaseMultiplayerReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  
  // Store lobby info in localStorage for reconnection
  const storeLobbyInfo = useCallback((lobby: Lobby, isHost: boolean) => {
    const lobbyInfo = {
      lobbyId: lobby.id,
      gameType: lobby.gameType,
      isHost,
      timestamp: Date.now()
    };
    localStorage.setItem('currentLobby', JSON.stringify(lobbyInfo));
  }, [chain, gameType]);
  
  // Clear stored lobby info
  const clearLobbyInfo = useCallback(() => {
    localStorage.removeItem('currentLobby');
  }, []);
  
  // Check for existing lobby on initialization
  const checkForExistingLobby = useCallback(async () => {
    const storedLobbyInfo = localStorage.getItem('currentLobby');
    if (storedLobbyInfo) {
      try {
        const lobbyInfo = JSON.parse(storedLobbyInfo);
        // Check if lobby info is not too old (24 hours)
        if (Date.now() - lobbyInfo.timestamp < 24 * 60 * 60 * 1000) {
          const collectionPath = `multiplayer-lobbies-${chain}-${lobbyInfo.gameType}`;
          const lobbyRef = ref(database, `${collectionPath}/${lobbyInfo.lobbyId}`);
          const snapshot = await get(lobbyRef);
          if (snapshot.exists()) {
            const lobbyData = snapshot.val();
            if (lobbyData.status === 'waiting' || lobbyData.status === 'playing') {
              setCurrentLobby({ id: lobbyInfo.lobbyId, ...lobbyData });
              return { lobby: { id: lobbyInfo.lobbyId, ...lobbyData }, isHost: lobbyInfo.isHost };
            }
          }
        }
        // Clear invalid or expired lobby info
        clearLobbyInfo();
      } catch (error) {
        console.error('Error checking for existing lobby:', error);
        clearLobbyInfo();
      }
    }
    return null;
  }, [chain, clearLobbyInfo]);
  const [gameMovesCallbacks, setGameMovesCallbacks] = useState<((moveData: any) => void)[]>([]);
  const [lobbyJoinedCallbacks, setLobbyJoinedCallbacks] = useState<((lobby: Lobby) => void)[]>([]);
  const [lobbyLeftCallbacks, setLobbyLeftCallbacks] = useState<((lobby: Lobby) => void)[]>([]);
  const [lobbyClosedCallbacks, setLobbyClosedCallbacks] = useState<(() => void)[]>([]);
  const [gameMovesListeners, setGameMovesListeners] = useState<{[lobbyId: string]: () => void}>({});
  const gameMovesCallbacksRef = useRef<((moveData: any) => void)[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    gameMovesCallbacksRef.current = gameMovesCallbacks;
  }, [gameMovesCallbacks]);

  useEffect(() => {
    // Try to connect to Firebase
    try {
      if (!database) {
        console.warn('Firebase not configured. Multiplayer features disabled.');
        setIsConnected(false);
        return;
      }

      // Listen to chain and game-specific multiplayer lobbies
      const collectionPath = gameType ? 
        `multiplayer-lobbies-${chain}-${gameType}` : 
        `multiplayer-lobbies-${chain}`;
      
      const multiplayerLobbiesRef = ref(database, collectionPath);
      const unsubscribeLobbies = onValue(multiplayerLobbiesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lobbiesArray: any[] = [];
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            lobbiesArray.push({
              ...value,
              id: key,
              chain: chain // Add chain info to lobby data
            });
          });
          // Only show waiting lobbies for regular multiplayer
          setLobbies(lobbiesArray.filter(lobby => lobby.status === 'waiting'));
        } else {
          setLobbies([]);
        }
      });
      
      console.log(`🔗 [FIREBASE MULTIPLAYER] Connected to ${collectionPath} collection`);

      setIsConnected(true);

      return () => {
        off(multiplayerLobbiesRef);
        setIsConnected(false);
      };
    
    } catch (error) {
      console.error('Firebase connection error:', error);
      setIsConnected(false);
    }
  }, [chain, gameType]);

  const generateLobbyId = (gameType: 'chess' | 'uno'): string => {
    const prefix = gameType.toUpperCase();
    const pin = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${pin}`;
  };




  const createLobby = async (gameType: 'chess' | 'uno' | 'pool', player1Name: string, player1Id: string): Promise<Lobby> => {
    if (!isConnected) throw new Error('Not connected to Firebase');

    try {
      const lobbyId = generateLobbyId(gameType);
      const collectionPath = `multiplayer-lobbies-${chain}-${gameType}`;
      const lobbyRef = ref(database, `${collectionPath}/${lobbyId}`);
      
      // Set lobby to expire after 1 hour if no activity
      const expirationTime = Date.now() + (60 * 60 * 1000); // 1 hour from now
      
      const newLobby: Omit<Lobby, 'id'> = {
        gameType,
        player1Id,
        player1Name,
        status: 'waiting',
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        expiresAt: expirationTime,
        chain: chain, // Add chain info
      };

      console.log(`🏗️ [FIREBASE MULTIPLAYER] Creating lobby in ${collectionPath}:`, lobbyId);
      await set(lobbyRef, newLobby);
      const createdLobby = { ...newLobby, id: lobbyId };
      setCurrentLobby(createdLobby);
      
      // Store lobby info for reconnection
      storeLobbyInfo(createdLobby, true);

      // Listen for lobby updates
      const unsubscribeLobby = onValue(lobbyRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const updatedLobby = { ...data, id: lobbyId };
          setCurrentLobby(updatedLobby);
          
          // Check if someone joined and game is ready to start
          if (data.player2Id && data.player2Id !== updatedLobby.player1Id) {
            console.log('🎮 [FIREBASE MULTIPLAYER] Player joined lobby, triggering game start callbacks for all players');
            console.log('🔔 [FIREBASE MULTIPLAYER] Lobby ready with both players:', {
              player1: data.player1Name,
              player2: data.player2Name,
              lobbyId: lobbyId,
              status: data.status
            });
            
            // Call callbacks immediately when both players are present
            lobbyJoinedCallbacks.forEach(callback => {
              console.log('📞 [FIREBASE MULTIPLAYER] Calling lobby joined callback for lobby:', lobbyId);
              try {
                callback(updatedLobby);
              } catch (callbackError) {
                console.error('❌ [FIREBASE MULTIPLAYER] Error in lobby joined callback:', callbackError);
              }
            });
          }
        } else {
          // Lobby was deleted
          console.log('🗑️ [FIREBASE MULTIPLAYER] Lobby was deleted');
          setCurrentLobby(null);
          lobbyClosedCallbacks.forEach(callback => callback());
        };
      });
      
      return createdLobby;
    } catch (error) {
      console.error('❌ [FIREBASE MULTIPLAYER] Error creating lobby:', error);
      throw error;
    }
  };

  const joinLobby = async (lobbyId: string, player2Name: string, player2Id: string, retryCount = 0) => {
    console.log('🔄 [JOIN LOBBY] Starting join process:', { lobbyId, player2Name, player2Id, isConnected, retryCount });
    
    if (!isConnected) {
      console.error('❌ [JOIN LOBBY] Not connected to Firebase');
      throw new Error('Not connected to Firebase');
    }

    try {
      console.log('📡 [JOIN LOBBY] Getting lobby reference for:', lobbyId);
      // Extract game type from lobby ID to determine collection path
      const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                            lobbyId.includes('UNO') ? 'uno' : 'pool';
      const collectionPath = `multiplayer-lobbies-${chain}-${gameTypeFromId}`;
      const lobbyRef = ref(database, `${collectionPath}/${lobbyId}`);
      
      // Get current lobby data
      console.log('📥 [JOIN LOBBY] Fetching current lobby data...');
      const snapshot = await get(lobbyRef);
      
      const lobbyData = snapshot.val();
      console.log('📊 [JOIN LOBBY] Current lobby data:', lobbyData);
      
      if (!lobbyData) {
        console.error('❌ [JOIN LOBBY] Lobby does not exist');
        throw new Error('Lobby not found');
      }
      
      if (lobbyData.status !== 'waiting') {
        console.error('❌ [JOIN LOBBY] Lobby status is not waiting:', lobbyData.status);
        throw new Error('Lobby is not accepting players');
      }
      
      if (lobbyData.player2Id) {
        console.error('❌ [JOIN LOBBY] Lobby already has player 2:', lobbyData.player2Id);
        throw new Error('Lobby is full');
      }

      // Update lobby with player 2 - keep status as 'waiting' until game actually starts
      const updatedLobbyData = {
        ...lobbyData,
        player2Id,
        player2Name,
        status: 'waiting', // Keep as waiting until both players are ready
        lastActivity: serverTimestamp(),
      };
      
      console.log('💾 [JOIN LOBBY] Updating lobby with player 2 data:', updatedLobbyData);
      await set(lobbyRef, updatedLobbyData);
      
      // Set current lobby immediately for joining player
      const joinedLobby = { ...updatedLobbyData, id: lobbyId };
      setCurrentLobby(joinedLobby);
      
      // Store lobby info for reconnection
      storeLobbyInfo(joinedLobby, false);
      
      console.log('✅ [JOIN LOBBY] Successfully joined lobby, triggering callbacks');
      
      // Trigger lobby joined callback for the joining player
      lobbyJoinedCallbacks.forEach(callback => {
        console.log('📞 [JOIN LOBBY] Calling lobby joined callback');
        callback(joinedLobby);
      });

      // Listen for lobby updates for the joining player
      console.log('👂 [JOIN LOBBY] Setting up lobby listener for updates');
      const unsubscribeLobby = onValue(lobbyRef, (snapshot) => {
        const data = snapshot.val();
        console.log('🔄 [JOIN LOBBY] Lobby update received:', data);
        if (data) {
          const updatedLobby = { ...data, id: lobbyId };
          setCurrentLobby(updatedLobby);
        } else {
          // Lobby was deleted
          console.log('🗑️ [JOIN LOBBY] Lobby was deleted');
          setCurrentLobby(null);
          lobbyClosedCallbacks.forEach(callback => callback());
        }
      });

    } catch (error) {
      console.error('💥 [JOIN LOBBY] Error joining lobby:', error);
      
      // Retry logic for network issues
      if (retryCount < 3 && (error as any)?.code === 'NETWORK_ERROR') {
        console.log(`🔄 [JOIN LOBBY] Retrying join (attempt ${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return joinLobby(lobbyId, player2Name, player2Id, retryCount + 1);
      }
      
      throw error;
    }
  };

  const leaveLobby = async (lobbyId: string, playerId?: string) => {
    if (!isConnected || !currentLobby) return;

    try {
      const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                            lobbyId.includes('UNO') ? 'uno' : 'pool';
      const collectionPath = `multiplayer-lobbies-${chain}-${gameTypeFromId}`;
      const lobbyRef = ref(database, `${collectionPath}/${lobbyId}`);
      const gameMovesRef = ref(database, `multiplayer-game-moves-${chain}-${gameTypeFromId}/${lobbyId}`);
      
      if (currentLobby.player1Id === playerId) {
        // Host is leaving, delete the lobby and cleanup game moves
        await remove(lobbyRef);
        await remove(gameMovesRef);
      } else {
        // Player 2 is leaving, reset to waiting and update activity
        await set(lobbyRef, {
          ...currentLobby,
          player2Id: null,
          player2Name: null,
          status: 'waiting',
          lastActivity: serverTimestamp()
        });
      }
      
      setCurrentLobby(null);
      clearLobbyInfo();
      lobbyLeftCallbacks.forEach(callback => callback(currentLobby));
    } catch (error) {
      console.error('Error leaving lobby:', error);
    }
  };

  const startGame = async (lobbyId: string) => {
    if (!isConnected || !currentLobby) return;

    try {
      const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                            lobbyId.includes('UNO') ? 'uno' : 'pool';
      const collectionPath = `multiplayer-lobbies-${chain}-${gameTypeFromId}`;
      const lobbyRef = ref(database, `${collectionPath}/${lobbyId}`);
      const snapshot = await get(lobbyRef);
      const lobbyData = snapshot.val();
      
      if (lobbyData && lobbyData.player2Id) {
        await set(lobbyRef, {
          ...lobbyData,
          status: 'playing',
          lastActivity: serverTimestamp(),
          gameStartTime: serverTimestamp()
        });
        console.log('Game started, lobby status updated to playing');
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const endGame = async (lobbyId: string, winnerId: string, winnerName: string, loserId: string, loserName: string) => {
    if (!isConnected) return;

    try {
      const lobbyRef = ref(database, `lobbies/${lobbyId}`);
      const gameMovesRef = ref(database, `game-moves/${lobbyId}`);
      const gameStatsRef = ref(database, 'game-statistics');
      
      // Get current lobby data to extract game info
      const snapshot = await get(lobbyRef);
      const lobbyData = snapshot.val();
      
      if (lobbyData) {
        // Calculate game duration
        const gameEndTime = Date.now();
        const gameStartTime = lobbyData.gameStartTime || lobbyData.createdAt;
        const gameDuration = Math.floor((gameEndTime - (gameStartTime.seconds ? gameStartTime.seconds * 1000 : gameStartTime)) / 1000);
        
        // Create game result record
        const gameResult: Omit<GameResult, 'id'> = {
          gameType: lobbyData.gameType,
          player1Id: lobbyData.player1Id,
          player1Name: lobbyData.player1Name,
          player2Id: lobbyData.player2Id,
          player2Name: lobbyData.player2Name,
          winnerId,
          winnerName,
          loserId,
          loserName,
          gameStartTime: gameStartTime,
          gameEndTime: serverTimestamp(),
          gameDuration,
          lobbyId
        };
        
        // Save game statistics
        await push(gameStatsRef, gameResult);
        
        // Update lobby status to finished
        await set(lobbyRef, {
          ...lobbyData,
          status: 'finished',
          lastActivity: serverTimestamp(),
          winnerId,
          winnerName
        });
        
        // Clean up lobby and game moves after a short delay to allow clients to process
        setTimeout(async () => {
          try {
            await remove(lobbyRef);
            await remove(gameMovesRef);
            console.log('Lobby and game moves cleaned up after game end');
          } catch (error) {
            console.error('Error cleaning up after game end:', error);
          }
        }, 5000); // 5 second delay
      }
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  const cleanupExpiredLobbies = async () => {
    if (!isConnected) return;

    try {
      // Clean up lobbies for each game type
      const gameTypes = ['chess', 'uno', 'pool'];
      let totalCleaned = 0;
      
      for (const gameType of gameTypes) {
        const collectionPath = `multiplayer-lobbies-${chain}-${gameType}`;
        const lobbiesRef = ref(database, collectionPath);
        const snapshot = await get(lobbiesRef);
        const lobbiesData = snapshot.val();
        
        if (lobbiesData) {
          const currentTime = Date.now();
          const expiredLobbies: string[] = [];
          
          Object.entries(lobbiesData).forEach(([lobbyId, lobbyData]: [string, any]) => {
            // Check if lobby has expired (2 minutes of inactivity for waiting lobbies, 1 hour for playing)
            const timeoutDuration = lobbyData.status === 'waiting' ? (2 * 60 * 1000) : (60 * 60 * 1000); // 2 minutes for waiting, 1 hour for playing
            const expiresAt = lobbyData.expiresAt || (lobbyData.createdAt + timeoutDuration);
            const lastActivity = lobbyData.lastActivity || lobbyData.createdAt;
            const lastActivityTime = lastActivity.seconds ? lastActivity.seconds * 1000 : lastActivity;
            const inactiveTime = currentTime - lastActivityTime;
            
            // Mark for cleanup if expired, inactive, or if it's a waiting lobby with no player2 after 2 minutes
            const shouldCleanup = currentTime > expiresAt || 
                                inactiveTime > timeoutDuration ||
                                (lobbyData.status === 'waiting' && !lobbyData.player2Id && inactiveTime > (2 * 60 * 1000));
            
            if (shouldCleanup) {
              expiredLobbies.push(lobbyId);
            }
          });
          
          // Clean up expired lobbies
          for (const lobbyId of expiredLobbies) {
            const lobbyRef = ref(database, `${collectionPath}/${lobbyId}`);
            const gameMovesRef = ref(database, `multiplayer-game-moves-${chain}-${gameType}/${lobbyId}`);
            await remove(lobbyRef);
            await remove(gameMovesRef);
            console.log(`🧹 [CLEANUP] Removed expired ${gameType} lobby: ${lobbyId}`);
          }
          
          totalCleaned += expiredLobbies.length;
        }
      }
      
      if (totalCleaned > 0) {
        console.log(`🧹 [CLEANUP] Cleaned up ${totalCleaned} expired lobbies across all game types`);
      }
    } catch (error) {
      console.error('❌ [CLEANUP] Error cleaning up expired lobbies:', error);
    }
  };

  const sendGameMove = async (lobbyId: string, poolGameState: any) => {
    if (!isConnected) return;

    try {
      const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                            lobbyId.includes('UNO') ? 'uno' : 'pool';
      const movesRef = ref(database, `multiplayer-game-moves-${chain}-${gameTypeFromId}/${lobbyId}`);
      await push(movesRef, {
        moveData: poolGameState,
        timestamp: serverTimestamp()
      });
      console.log(`🔥 [FIREBASE] Game move sent for lobby ${lobbyId} on ${chain} chain`);
    } catch (error) {
      console.error('Error sending game move:', error);
    }
  };

  const setupGameMovesListener = (lobbyId: string) => {
    if (gameMovesListeners[lobbyId]) {
      return; // Already listening to this lobby
    }

    const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                          lobbyId.includes('UNO') ? 'uno' : 'pool';
    const movesRef = ref(database, `multiplayer-game-moves-${chain}-${gameTypeFromId}/${lobbyId}`);
    const unsubscribe = onValue(movesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Get the latest move (last entry)
        const moves = Object.values(data) as any[];
        const latestMove = moves[moves.length - 1];
        if (latestMove && latestMove.moveData) {
          console.log(`🔥 [FIREBASE] Game move received for lobby ${lobbyId} on ${chain} chain:`, latestMove.moveData);
          console.log('🔥 [FIREBASE] Current callbacks count:', gameMovesCallbacksRef.current.length);
          gameMovesCallbacksRef.current.forEach(callback => callback(latestMove.moveData));
        }
      }
    });

    setGameMovesListeners(prev => ({ ...prev, [lobbyId]: unsubscribe }));
  };
  const onGameMove = useCallback((callback: (moveData: any) => void) => {
    setGameMovesCallbacks(prev => [...prev, callback]);
    return () => {
      setGameMovesCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  const onLobbyJoined = useCallback((callback: (lobby: Lobby) => void) => {
    setLobbyJoinedCallbacks(prev => [...prev, callback]);
    return () => {
      setLobbyJoinedCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  const onLobbyLeft = useCallback((callback: (lobby: Lobby) => void) => {
    setLobbyLeftCallbacks(prev => [...prev, callback]);
    return () => {
      setLobbyLeftCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  const onLobbyClosed = useCallback((callback: () => void) => {
    setLobbyClosedCallbacks(prev => [...prev, callback]);
    return () => {
      setLobbyClosedCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  // Run cleanup on mount and periodically
  useEffect(() => {
    if (isConnected) {
      // Initial cleanup
      cleanupExpiredLobbies();
      
      // Set up periodic cleanup every 10 minutes
      const cleanupInterval = setInterval(() => {
        cleanupExpiredLobbies();
      }, 10 * 60 * 1000); // 10 minutes
      
      return () => {
        clearInterval(cleanupInterval);
      };
    }
  }, [isConnected]);

  return {
    isConnected,
    lobbies,
    currentLobby,
    createLobby,
    joinLobby,
    leaveLobby,
    startGame,
    endGame,
    sendGameMove,
    onGameMove,
    setupGameMovesListener,
    onLobbyJoined,
    onLobbyLeft,
    onLobbyClosed,
    cleanupExpiredLobbies,
    checkForExistingLobby
  };
};