import { useState, useEffect, useCallback, useRef } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, get, push, remove, serverTimestamp } from 'firebase/database';

interface BettingLobby {
  id: string;
  gameType: 'chess' | 'uno' | 'pool';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
  lastActivity?: any;
  expiresAt?: any;
  isGamble: boolean;
  betAmount?: string;
  contractAddress?: string;
  player1Paid?: boolean;
  player2Paid?: boolean;
  contractDeployed?: boolean;
  player1TxHash?: string;
  player2TxHash?: string;
  chain?: 'sonic' | 'base'; // Chain identifier
}

interface UseFirebaseBettingReturn {
  isConnected: boolean;
  bettingLobbies: BettingLobby[];
  createBettingLobby: (gameType: 'chess' | 'uno' | 'pool', player1Name: string, player1Id: string, betAmount: string) => Promise<BettingLobby>;
  joinBettingLobby: (lobbyId: string, player2Name: string, player2Id: string) => Promise<void>;
  leaveBettingLobby: (lobbyId: string, playerId?: string) => Promise<void>;
  startBettingGame: (lobbyId: string) => Promise<void>;
  endBettingGame: (lobbyId: string, winnerId: string, winnerName: string, loserId: string, loserName: string) => Promise<void>;
  sendBettingGameMove: (lobbyId: string, gameState: any) => Promise<void>;
  onBettingGameMove: (callback: (gameState: any) => void) => () => void;
  setupBettingGameMovesListener: (lobbyId: string) => void;
  onBettingLobbyJoined: (callback: (lobby: BettingLobby) => void) => () => void;
  onBettingLobbyLeft: (callback: (lobby: BettingLobby) => void) => void;
  onBettingLobbyClosed: (callback: () => void) => void;
}

export const useFirebaseBetting = (chain: 'sonic' | 'base' = 'sonic', gameType?: 'chess' | 'uno' | 'pool'): UseFirebaseBettingReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [bettingLobbies, setBettingLobbies] = useState<BettingLobby[]>([]);
  const [currentBettingLobby, setCurrentBettingLobby] = useState<BettingLobby | null>(null);
  const [gameMovesCallbacks, setGameMovesCallbacks] = useState<((gameState: any) => void)[]>([]);
  const [lobbyJoinedCallbacks, setLobbyJoinedCallbacks] = useState<((lobby: BettingLobby) => void)[]>([]);
  const [lobbyLeftCallbacks, setLobbyLeftCallbacks] = useState<((lobby: BettingLobby) => void)[]>([]);
  const [lobbyClosedCallbacks, setLobbyClosedCallbacks] = useState<(() => void)[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Try to connect to Firebase
    try {
      if (!database) {
        console.warn('Firebase not configured. Betting features disabled.');
        setIsConnected(false);
        return;
      }

      // Listen to chain and game-specific betting lobbies
      const collectionPath = gameType ? 
        `betting-lobbies-${chain}-${gameType}` : 
        `betting-lobbies-${chain}`;
      
      const bettingLobbiesRef = ref(database, collectionPath);
      const unsubscribeLobbies = onValue(bettingLobbiesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lobbiesArray: BettingLobby[] = [];
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            lobbiesArray.push({
              ...value,
              id: key,
              chain: chain // Add chain info to lobby data
            });
          });
          setBettingLobbies(lobbiesArray.filter(lobby => lobby.status === 'waiting'));
        } else {
          setBettingLobbies([]);
        }
      });
      
      console.log(`🔗 [FIREBASE BETTING] Connected to ${collectionPath} collection`);

      setIsConnected(true);

      return () => {
        unsubscribeLobbies();
      };
    } catch (error) {
      console.error('Error connecting to Firebase for betting:', error);
      setIsConnected(false);
    }
  }, [chain, gameType]);

  const generateBettingLobbyId = (gameType: 'chess' | 'uno' | 'pool'): string => {
    const prefix = `BET-${gameType.toUpperCase()}`;
    const pin = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${pin}`;
  };

  const createBettingLobby = async (gameType: 'chess' | 'uno' | 'pool', player1Name: string, player1Id: string, betAmount: string): Promise<BettingLobby> => {
    if (!isConnected) throw new Error('Not connected to Firebase');

    try {
      const lobbyId = generateBettingLobbyId(gameType);
      const collectionPath = `betting-lobbies-${chain}-${gameType}`;
      const lobbyRef = ref(database, `${collectionPath}/${lobbyId}`);
      
      // Set lobby to expire after 1 hour if no activity
      const expirationTime = Date.now() + (60 * 60 * 1000);
      
      const newLobby: Omit<BettingLobby, 'id'> = {
        gameType,
        player1Id,
        player1Name,
        status: 'waiting',
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        expiresAt: expirationTime,
        isGamble: true,
        betAmount,
        player1Paid: false,
        player2Paid: false,
        contractDeployed: false,
        chain
      };

      console.log(`🏗️ [FIREBASE BETTING] Creating betting lobby in ${collectionPath}:`, lobbyId);
      await set(lobbyRef, newLobby);
      const createdLobby = { ...newLobby, id: lobbyId };
      setCurrentBettingLobby(createdLobby);
      
      // Listen for lobby updates (when player 2 joins)
      const unsubscribeLobby = onValue(lobbyRef, (snapshot) => {
        const data = snapshot.val();
        console.log('🔄 [BETTING CREATE] Host received lobby update:', data);
        if (data) {
          const updatedLobby = { ...data, id: lobbyId };
          setCurrentBettingLobby(updatedLobby);
          
          // Check if someone joined and game is ready to start
          if (data.player2Id && data.status === 'playing') {
            console.log('🎮 [BETTING CREATE] Player joined betting lobby, triggering game start for host');
            lobbyJoinedCallbacks.forEach(callback => {
              console.log('📞 [BETTING CREATE] Calling lobby joined callback for host');
              callback(updatedLobby);
            });
          }
        } else {
          // Lobby was deleted
          console.log('🗑️ [BETTING CREATE] Betting lobby was deleted');
          setCurrentBettingLobby(null);
          lobbyClosedCallbacks.forEach(callback => callback());
        }
      });
      
      return createdLobby;
    } catch (error) {
      console.error('❌ [FIREBASE BETTING] Error creating betting lobby:', error);
      throw error;
    }
  };

  const joinBettingLobby = async (lobbyId: string, player2Name: string, player2Id: string): Promise<void> => {
    if (!isConnected) throw new Error('Not connected to Firebase');

    try {
      console.log('📡 [BETTING JOIN] Getting betting lobby reference for:', lobbyId);
      // Extract game type from lobby ID to determine collection path
      const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                            lobbyId.includes('UNO') ? 'uno' : 'pool';
      const collectionPath = `betting-lobbies-${chain}-${gameTypeFromId}`;
      const lobbyRef = ref(database, `${collectionPath}/${lobbyId}`);
      
      const snapshot = await get(lobbyRef);
      const lobbyData = snapshot.val();
      
      if (!lobbyData) {
        throw new Error('Betting lobby not found');
      }
      
      if (lobbyData.status !== 'waiting') {
        throw new Error('Betting lobby is not accepting players');
      }
      
      if (lobbyData.player2Id) {
        throw new Error('Betting lobby is full');
      }
      
      // If the joining player is the same as player1, assign them as player2
      let finalPlayer2Id = player2Id;
      let finalPlayer2Name = player2Name;
      
      if (player2Id === lobbyData.player1Id) {
        console.log('🔄 [BETTING JOIN] Player is same as host, assigning as player2');
        // Keep the same ID but ensure they are treated as player2
        finalPlayer2Id = player2Id;
        finalPlayer2Name = player2Name;
      }

      const updatedLobbyData = {
        ...lobbyData,
        player2Id: finalPlayer2Id,
        player2Name: finalPlayer2Name,
        status: 'playing', // Change status to playing when both players are present
        lastActivity: serverTimestamp(),
        gameStartTime: serverTimestamp()
      };
      
      console.log('💾 [BETTING JOIN] Updating betting lobby with player 2 and starting game');
      await set(lobbyRef, updatedLobbyData);
      
      const joinedLobby = { ...updatedLobbyData, id: lobbyId };
      setCurrentBettingLobby(joinedLobby);
      
      console.log('✅ [BETTING JOIN] Successfully joined betting lobby, triggering game start');
      
      // Trigger callbacks for both players
      lobbyJoinedCallbacks.forEach(callback => {
        console.log('📞 [BETTING JOIN] Calling lobby joined callback');
        callback(joinedLobby);
      });

    } catch (error) {
      console.error('💥 [BETTING JOIN] Error joining betting lobby:', error);
      throw error;
    }
  };

  const leaveBettingLobby = async (lobbyId: string, playerId?: string): Promise<void> => {
    if (!isConnected || !currentBettingLobby) return;

    try {
      const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                            lobbyId.includes('UNO') ? 'uno' : 'pool';
      const collectionPath = `betting-lobbies-${chain}-${gameTypeFromId}`;
      const lobbyRef = ref(database, `${collectionPath}/${lobbyId}`);
      
      if (currentBettingLobby.player1Id === playerId) {
        // Host is leaving, delete the betting lobby
        await remove(lobbyRef);
      } else {
        // Player 2 is leaving, reset to waiting
        await set(lobbyRef, {
          ...currentBettingLobby,
          player2Id: null,
          player2Name: null,
          status: 'waiting',
          lastActivity: serverTimestamp()
        });
      }
      
      setCurrentBettingLobby(null);
      lobbyLeftCallbacks.forEach(callback => callback(currentBettingLobby));
    } catch (error) {
      console.error('❌ [BETTING LEAVE] Error leaving betting lobby:', error);
    }
  };

  const startBettingGame = async (lobbyId: string): Promise<void> => {
    if (!isConnected) return;

    try {
      const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                            lobbyId.includes('UNO') ? 'uno' : 'pool';
      const collectionPath = `betting-lobbies-${chain}-${gameTypeFromId}`;
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
        console.log(`🎮 [BETTING] Game started on ${chain} chain, lobby status updated to playing`);
      }
    } catch (error) {
      console.error('❌ [BETTING] Error starting game:', error);
    }
  };

  const endBettingGame = async (lobbyId: string, winnerId: string, winnerName: string, loserId: string, loserName: string): Promise<void> => {
    if (!isConnected) return;

    try {
      const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                            lobbyId.includes('UNO') ? 'uno' : 'pool';
      const collectionPath = `betting-lobbies-${chain}-${gameTypeFromId}`;
      const lobbyRef = ref(database, `${collectionPath}/${lobbyId}`);
      const snapshot = await get(lobbyRef);
      const lobbyData = snapshot.val();
      
      if (lobbyData) {
        await set(lobbyRef, {
          ...lobbyData,
          status: 'finished',
          winnerId,
          winnerName,
          loserId,
          loserName,
          gameEndTime: serverTimestamp(),
          lastActivity: serverTimestamp()
        });
        console.log(`🏁 [BETTING] Game ended on ${chain} chain, lobby status updated to finished`);
      }
    } catch (error) {
      console.error('❌ [BETTING] Error ending game:', error);
    }
  };

  const sendBettingGameMove = async (lobbyId: string, gameState: any): Promise<void> => {
    if (!isConnected) return;

    try {
      const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                            lobbyId.includes('UNO') ? 'uno' : 'pool';
      const movesRef = ref(database, `betting-game-moves-${chain}-${gameTypeFromId}/${lobbyId}`);
      await push(movesRef, {
        moveData: gameState,
        timestamp: serverTimestamp(),
        playerId: gameState.playerId || 'unknown'
      });
      console.log('📤 [BETTING] Game move sent for lobby:', lobbyId);
    } catch (error) {
      console.error('❌ [BETTING] Error sending game move:', error);
    }
  };

  const setupBettingGameMovesListener = (lobbyId: string): void => {
    const gameTypeFromId = lobbyId.includes('CHESS') ? 'chess' : 
                          lobbyId.includes('UNO') ? 'uno' : 'pool';
    const movesRef = ref(database, `betting-game-moves-${chain}-${gameTypeFromId}/${lobbyId}`);
    const unsubscribe = onValue(movesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const moves = Object.values(data) as any[];
        const latestMove = moves[moves.length - 1];
        if (latestMove && latestMove.moveData) {
          console.log(`📥 [BETTING] Game move received for lobby ${lobbyId} on ${chain} chain`);
          gameMovesCallbacks.forEach(callback => callback(latestMove.moveData));
        }
      }
    });
  };

  const onBettingGameMove = useCallback((callback: (gameState: any) => void): (() => void) => {
    setGameMovesCallbacks(prev => [...prev, callback]);
    return () => {
      setGameMovesCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  const onBettingLobbyJoined = useCallback((callback: (lobby: BettingLobby) => void): (() => void) => {
    setLobbyJoinedCallbacks(prev => [...prev, callback]);
    
    // Return unsubscribe function
    return () => {
      if (mountedRef.current) {
        setLobbyJoinedCallbacks(prev => prev.filter(cb => cb !== callback));
      }
    };
  }, []);

  const onBettingLobbyLeft = useCallback((callback: (lobby: BettingLobby) => void): void => {
    setLobbyLeftCallbacks(prev => [...prev, callback]);
  }, []);

  const onBettingLobbyClosed = useCallback((callback: () => void): void => {
    setLobbyClosedCallbacks(prev => [...prev, callback]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    isConnected,
    bettingLobbies,
    createBettingLobby,
    joinBettingLobby,
    leaveBettingLobby,
    startBettingGame,
    endBettingGame,
    sendBettingGameMove,
    onBettingGameMove,
    setupBettingGameMovesListener,
    onBettingLobbyJoined,
    onBettingLobbyLeft,
    onBettingLobbyClosed
  };
};