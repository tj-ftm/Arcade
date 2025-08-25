import { useEffect, useState, useRef, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, push, onValue, off, remove, set, serverTimestamp, get } from 'firebase/database';

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

interface UseFirebaseMultiplayerReturn {
  isConnected: boolean;
  lobbies: Lobby[];
  currentLobby: Lobby | null;
  createLobby: (gameType: 'chess' | 'uno', player1Name: string, player1Id: string) => Promise<void>;
  joinLobby: (lobbyId: string, player2Name: string, player2Id: string) => Promise<void>;
  leaveLobby: (lobbyId: string, playerId?: string) => Promise<void>;
  startGame: (lobbyId: string) => Promise<void>;
  sendGameMove: (lobbyId: string, moveData: any) => Promise<void>;
  onGameMove: (callback: (moveData: any) => void) => () => void;
  onLobbyJoined: (callback: (lobby: Lobby) => void) => () => void;
  onLobbyLeft: (callback: (lobby: Lobby) => void) => () => void;
  onLobbyClosed: (callback: () => void) => () => void;
}

export const useFirebaseMultiplayer = (): UseFirebaseMultiplayerReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [gameMovesCallbacks, setGameMovesCallbacks] = useState<((moveData: any) => void)[]>([]);
  const [lobbyJoinedCallbacks, setLobbyJoinedCallbacks] = useState<((lobby: Lobby) => void)[]>([]);
  const [lobbyLeftCallbacks, setLobbyLeftCallbacks] = useState<((lobby: Lobby) => void)[]>([]);
  const [lobbyClosedCallbacks, setLobbyClosedCallbacks] = useState<(() => void)[]>([]);

  useEffect(() => {
    // Try to connect to Firebase
    try {
      if (!database) {
        console.warn('Firebase not configured. Multiplayer features disabled.');
        setIsConnected(false);
        return;
      }

      // Listen to lobbies
      const lobbiesRef = ref(database, 'lobbies');
      const unsubscribeLobbies = onValue(lobbiesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lobbiesArray: any[] = [];
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            lobbiesArray.push({
              ...value,
              id: key
            });
          });
          setLobbies(lobbiesArray.filter(lobby => lobby.status === 'waiting'));
        } else {
          setLobbies([]);
        }
      });

      setIsConnected(true);

      return () => {
        off(lobbiesRef);
        setIsConnected(false);
      };
    
    } catch (error) {
      console.error('Firebase connection error:', error);
      setIsConnected(false);
    }
  }, []);

  const generateLobbyId = (gameType: 'chess' | 'uno'): string => {
    const prefix = gameType.toUpperCase();
    const pin = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${pin}`;
  };




  const createLobby = async (gameType: 'chess' | 'uno', player1Name: string, player1Id: string): Promise<void> => {
    if (!isConnected) return;

    try {
      const lobbyId = generateLobbyId(gameType);
      const lobbyRef = ref(database, `lobbies/${lobbyId}`);
      
      const newLobby: Omit<Lobby, 'id'> = {
        gameType,
        player1Id,
        player1Name,
        status: 'waiting',
        createdAt: serverTimestamp(),
      };

      await set(lobbyRef, newLobby);
      setCurrentLobby({ ...newLobby, id: lobbyId });

      // Listen for lobby updates
      const unsubscribeLobby = onValue(lobbyRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const updatedLobby = { ...data, id: lobbyId };
          setCurrentLobby(updatedLobby);
          
          // Check if someone joined and game is ready to start
          if (data.player2Id) {
            console.log('Player joined lobby, triggering game start for host');
            lobbyJoinedCallbacks.forEach(callback => callback(updatedLobby));
          }
        } else {
          // Lobby was deleted
          setCurrentLobby(null);
          lobbyClosedCallbacks.forEach(callback => callback());
        }
      });
    } catch (error) {
      console.error('Error creating lobby:', error);
      throw error;
    }
  };

  const joinLobby = async (lobbyId: string, player2Name: string, player2Id: string) => {
    console.log('🔄 [JOIN LOBBY] Starting join process:', { lobbyId, player2Name, player2Id, isConnected });
    
    if (!isConnected) {
      console.error('❌ [JOIN LOBBY] Not connected to Firebase');
      return;
    }

    try {
      console.log('📡 [JOIN LOBBY] Getting lobby reference for:', lobbyId);
      const lobbyRef = ref(database, `lobbies/${lobbyId}`);
      
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
      };
      
      console.log('💾 [JOIN LOBBY] Updating lobby with player 2 data:', updatedLobbyData);
      await set(lobbyRef, updatedLobbyData);
      
      // Set current lobby immediately for joining player
      const joinedLobby = { ...updatedLobbyData, id: lobbyId };
      setCurrentLobby(joinedLobby);
      
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
      throw error;
    }
  };

  const leaveLobby = async (lobbyId: string, playerId?: string) => {
    if (!isConnected || !currentLobby) return;

    try {
      const lobbyRef = ref(database, `lobbies/${lobbyId}`);
      
      if (currentLobby.player1Id === playerId) {
        // Host is leaving, delete the lobby
        await remove(lobbyRef);
      } else {
        // Player 2 is leaving, reset to waiting
        await set(lobbyRef, {
          ...currentLobby,
          player2Id: null,
          player2Name: null,
          status: 'waiting'
        });
      }
      
      setCurrentLobby(null);
      lobbyLeftCallbacks.forEach(callback => callback(currentLobby));
    } catch (error) {
      console.error('Error leaving lobby:', error);
    }
  };

  const startGame = async (lobbyId: string) => {
    if (!isConnected) return;

    try {
      const lobbyRef = ref(database, `lobbies/${lobbyId}`);
      const snapshot = await get(lobbyRef);
      const lobbyData = snapshot.val();
      
      if (lobbyData && lobbyData.player2Id) {
        await set(lobbyRef, {
          ...lobbyData,
          status: 'playing'
        });
        console.log('Game started, lobby status updated to playing');
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const sendGameMove = async (lobbyId: string, moveData: any, playerId?: string) => {
    if (!isConnected) return;

    try {
      const moveRef = ref(database, `game-moves/${lobbyId}`);
      await push(moveRef, {
        moveData,
        playerId: playerId || 'unknown',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending game move:', error);
    }
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

  return {
    isConnected,
    lobbies,
    currentLobby,
    createLobby,
    joinLobby,
    leaveLobby,
    startGame,
    sendGameMove,
    onGameMove,
    onLobbyJoined,
    onLobbyLeft,
    onLobbyClosed
  };
};