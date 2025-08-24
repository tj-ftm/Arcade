import { useEffect, useState, useRef, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, push, onValue, off, remove, set, serverTimestamp } from 'firebase/database';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any; // Firebase timestamp
  player1Color?: 'white' | 'black';
  player2Color?: 'white' | 'black';
}

interface UseFirebaseMultiplayerReturn {
  isConnected: boolean;
  lobbies: Lobby[];
  currentLobby: Lobby | null;
  createLobby: (gameType: 'chess' | 'uno', player1Name: string, player1Id: string) => Promise<void>;
  joinLobby: (lobbyId: string, player2Name: string, player2Id: string) => Promise<void>;
  leaveLobby: (lobbyId: string, playerId?: string) => Promise<void>;
  sendGameMove: (lobbyId: string, moveData: any) => Promise<void>;
  onGameMove: (callback: (moveData: any) => void) => void;
  onLobbyJoined: (callback: (lobby: Lobby) => void) => void;
  onLobbyLeft: (callback: (lobby: Lobby) => void) => void;
  onLobbyClosed: (callback: () => void) => void;
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
    // Check if Firebase is configured
    const isFirebaseConfigured = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                                 process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    
    if (!isFirebaseConfigured) {
      console.warn('Firebase not configured. Multiplayer features disabled.');
      setIsConnected(false);
      return;
    }

    try {
      // Listen to lobbies
      const lobbiesRef = ref(database, 'lobbies');
      const unsubscribeLobbies = onValue(lobbiesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lobbiesArray = Object.entries(data).map(([key, value]: [string, any]) => ({
            ...value,
            id: key
          }));
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

  const createLobby = async (gameType: 'chess' | 'uno', player1Name: string, player1Id: string) => {
    if (!isConnected) return;

    try {
      const lobbyId = generateLobbyId(gameType);
      const lobbyRef = ref(database, `lobbies/${lobbyId}`);
      
      const colors = Math.random() < 0.5 ? { player1: 'white', player2: 'black' } : { player1: 'black', player2: 'white' };
      const newLobby: Omit<Lobby, 'id'> = {
        gameType,
        player1Id,
        player1Name,
        status: 'waiting',
        createdAt: serverTimestamp(),
        player1Color: colors.player1,
        player2Color: colors.player2
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
          if (data.player2Id && data.status === 'playing' && data.player1Color && data.player2Color) {
            lobbyJoinedCallbacks.forEach(callback => callback(updatedLobby));
          }
        } else {
          // Lobby was deleted
          setCurrentLobby(null);
          lobbyClosedCallbacks.forEach(callback => callback());
        }
      });

      return () => off(lobbyRef);
    } catch (error) {
      console.error('Error creating lobby:', error);
      throw error;
    }
  };

  const joinLobby = async (lobbyId: string, player2Name: string, player2Id: string) => {
    if (!isConnected) return;

    try {
      const lobbyRef = ref(database, `lobbies/${lobbyId}`);
      
      // Get current lobby data
      const snapshot = await new Promise<any>((resolve) => {
        onValue(lobbyRef, resolve, { onlyOnce: true });
      });
      
      const lobbyData = snapshot.val();
      if (!lobbyData || lobbyData.status !== 'waiting' || lobbyData.player2Id) {
        throw new Error('Lobby not available');
      }

      // Update lobby with player 2
      // Assign colors if not already assigned (should be assigned by host on creation)
      // Assign colors if not already assigned (should be assigned by host on creation)
      // If for some reason colors are not set, assign them here (fallback)
      const assignedPlayer1Color = lobbyData.player1Color || (Math.random() < 0.5 ? 'white' : 'black');
      const assignedPlayer2Color = lobbyData.player2Color || (assignedPlayer1Color === 'white' ? 'black' : 'white');

      await set(lobbyRef, {
        ...lobbyData,
        player2Id,
        player2Name,
        status: 'playing',
        player1Color: assignedPlayer1Color,
        player2Color: assignedPlayer2Color
      });

      // Listen for lobby updates for the joining player
      const unsubscribeLobby = onValue(lobbyRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const updatedLobby = { ...data, id: lobbyId };
          setCurrentLobby(updatedLobby);
          
          // Trigger callback only when both players are present and status is playing
          if (data.player1Id && data.player2Id && data.status === 'playing' && data.player1Color && data.player2Color) {
            lobbyJoinedCallbacks.forEach(callback => callback(updatedLobby));
          }
        } else {
          // Lobby was deleted
          setCurrentLobby(null);
          lobbyClosedCallbacks.forEach(callback => callback());
        }
      });

      // Clean up listener when component unmounts or lobby is left
      return () => off(lobbyRef);

    } catch (error) {
      console.error('Error joining lobby:', error);
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

  const sendGameMove = async (lobbyId: string, moveData: any) => {
    if (!isConnected) return;

    try {
      const moveRef = ref(database, `game-moves/${lobbyId}`);
      await push(moveRef, {
        moveData,
        playerId: currentUserIdRef.current,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending game move:', error);
    }
  };

  const onGameMove = useCallback((callback: (moveData: any) => void) => {
    setGameMovesCallbacks(prev => [...prev, callback]);
  }, []);

  const onLobbyJoined = useCallback((callback: (lobby: Lobby) => void) => {
    setLobbyJoinedCallbacks(prev => [...prev, callback]);
    return () => {
      setLobbyJoinedCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  const onLobbyLeft = useCallback((callback: (lobby: Lobby) => void) => {
    setLobbyLeftCallbacks(prev => [...prev, callback]);
  }, []);

  const onLobbyClosed = useCallback((callback: () => void) => {
    setLobbyClosedCallbacks(prev => [...prev, callback]);
  }, []);

  return {
    isConnected,
    lobbies,
    currentLobby,
    createLobby,
    joinLobby,
    leaveLobby,
    sendGameMove,
    onGameMove,
    onLobbyJoined,
    onLobbyLeft,
    onLobbyClosed
  };
};