import { useEffect, useState } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useFirebaseMultiplayer } from './use-firebase-multiplayer';

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
  onBettingLobbyJoined: (callback: (lobby: BettingLobby) => void) => void;
  onBettingLobbyLeft: (callback: (lobby: BettingLobby) => void) => void;
  onBettingLobbyClosed: (callback: () => void) => void;
}

export const useFirebaseBetting = (): UseFirebaseBettingReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [bettingLobbies, setBettingLobbies] = useState<BettingLobby[]>([]);
  
  // Use the base multiplayer hook for core functionality
  const {
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
    onLobbyClosed
  } = useFirebaseMultiplayer();

  useEffect(() => {
    // Try to connect to Firebase
    try {
      if (!database) {
        console.warn('Firebase not configured. Betting features disabled.');
        setIsConnected(false);
        return;
      }

      // Listen to betting lobbies only
      const lobbiesRef = ref(database, 'lobbies');
      const unsubscribeLobbies = onValue(lobbiesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lobbiesArray: BettingLobby[] = [];
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            // Only include betting lobbies (isGamble = true)
            if (value.isGamble === true) {
              lobbiesArray.push({
                ...value,
                id: key
              });
            }
          });
          setBettingLobbies(lobbiesArray.filter(lobby => lobby.status === 'waiting'));
        } else {
          setBettingLobbies([]);
        }
      });

      setIsConnected(true);

      return () => {
        unsubscribeLobbies();
      };
    } catch (error) {
      console.error('Error connecting to Firebase for betting:', error);
      setIsConnected(false);
    }
  }, []);

  const createBettingLobby = async (gameType: 'chess' | 'uno' | 'pool', player1Name: string, player1Id: string, betAmount: string): Promise<BettingLobby> => {
    const lobby = await createLobby(gameType, player1Name, player1Id, {
      isGamble: true,
      betAmount,
      player1Paid: false,
      player2Paid: false,
      contractDeployed: false
    });
    return lobby as BettingLobby;
  };

  const joinBettingLobby = async (lobbyId: string, player2Name: string, player2Id: string): Promise<void> => {
    return joinLobby(lobbyId, player2Name, player2Id);
  };

  const leaveBettingLobby = async (lobbyId: string, playerId?: string): Promise<void> => {
    return leaveLobby(lobbyId, playerId);
  };

  const startBettingGame = async (lobbyId: string): Promise<void> => {
    return startGame(lobbyId);
  };

  const endBettingGame = async (lobbyId: string, winnerId: string, winnerName: string, loserId: string, loserName: string): Promise<void> => {
    return endGame(lobbyId, winnerId, winnerName, loserId, loserName);
  };

  const sendBettingGameMove = async (lobbyId: string, gameState: any): Promise<void> => {
    return sendGameMove(lobbyId, gameState);
  };

  const onBettingGameMove = (callback: (gameState: any) => void): (() => void) => {
    return onGameMove(callback);
  };

  const setupBettingGameMovesListener = (lobbyId: string): void => {
    return setupGameMovesListener(lobbyId);
  };

  const onBettingLobbyJoined = (callback: (lobby: BettingLobby) => void): void => {
    return onLobbyJoined(callback as any);
  };

  const onBettingLobbyLeft = (callback: (lobby: BettingLobby) => void): void => {
    return onLobbyLeft(callback as any);
  };

  const onBettingLobbyClosed = (callback: () => void): void => {
    return onLobbyClosed(callback);
  };

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